const dotenv = require('dotenv').config();
const db = require('./db/connection.js');
const { fetchHoneyswapInfo, fetchTransactions, updateSavedPairs } = require("./utilities/gatherHoneyswapTransactions.js")
const { findOrCreate, getFromDB, findOneAndDelete } = require("./utilities/db.js")
const pairs = require("./storage/pairs.json")
const files = require('./utilities/fileSystemInteraction.js');
const filters = require('./utilities/filters.js');
const { endianness } = require('os');
const myArgs = process.argv.slice(2);
const { Worker } = require('worker_threads')

// important constants

let startBlockNumber = false;
let endBlockNumber = false;
let threads = false;
let errors = false;
let fetchOptions = require('./FetchOptions.json');
let outputFile = 'FetchOutput.json'

const timestampNow = Math.floor(Date.now() / 1000);

setTimeout(() => argumentHandler(), 2000)

// handle the arguments

async function argumentHandler() {
    if (myArgs[0] === ("update")) {
        if (myArgs.includes("--start") || myArgs.includes("-s")) {
            let index = Math.max(myArgs.indexOf("--start"), myArgs.indexOf("-s"))
            startBlockNumber = Number(myArgs[index + 1])
        }
        if (myArgs.includes("--end") || myArgs.includes("-e")) {
            let index = Math.max(myArgs.indexOf("--end"), myArgs.indexOf("-e"))
            endBlockNumber = Number(myArgs[index + 1])
        }
        if (myArgs.includes("--threads") || myArgs.includes("-t")) {
            let index = Math.max(myArgs.indexOf("--threads"), myArgs.indexOf("-t"))
            threads = Number(myArgs[index + 1])
        }
        start()
    }
    else if (myArgs[0] === "fix-missing") {

        fixMissing()
    }
    else if (myArgs[0] === "fetch") {
        let options = fetchOptions
        let dataArray = [];
        let fetchLoop = false;

        if (myArgs.includes("--filter") || myArgs.includes("-f")) {
            let index = Math.max(myArgs.indexOf("--filter"), myArgs.indexOf("-f"))
            options.filter.filterName = myArgs[index + 1]
        };

        if (myArgs.includes("--output") || myArgs.includes("-o")) {
            let index = Math.max(myArgs.indexOf("--output"), myArgs.indexOf("-o"))
            outputFile = myArgs[index + 1]
        };


        if (myArgs.includes("--loop") || myArgs.includes("-l")) {
            let index = Math.max(myArgs.indexOf("--loop"), myArgs.indexOf("-l"))
            fetchLoop = Number(myArgs[index + 1])
        };

        if (fetchLoop && fetchLoop > 0) {
            let lowerTimestamp = 1599154210;
            let higherTimestamp = 1599154210 + (fetchLoop * 60 * 60)
            let loops = Math.ceil((timestampNow - lowerTimestamp) / (fetchLoop * 60 * 60))
            for (let i = 0; lowerTimestamp < timestampNow; i++) {
                lowerTimestamp += (fetchLoop * 60 * 60);
                higherTimestamp += (fetchLoop * 60 * 60)
                options.filter.vars.lowerTimestamp = lowerTimestamp
                options.filter.vars.higherTimestamp = higherTimestamp
                console.log(`${i} out of ${loops}`)
                let data = await fetchData(options)
                dataArray.push(data)
            }
        }
        else {
            if (!fetchLoop && myArgs.includes("--pair") || myArgs.includes("-p")) {
                let index = Math.max(myArgs.indexOf("--pair"), myArgs.indexOf("-p"))
                if (myArgs[index + 1].toLowerCase() === 'all') {
                    for (pair in pairs) {
                        options.filter.vars.pairAddress = pairs[pair].id;
                        let data = await fetchData(options)
                        data = data.toString()
                        files.writeFile(`pairs/${pairs[pair].id}.json`, data)
                    }
                }
                else {
                    options.filter.vars.pairAddress = myArgs[index + 1].toLowerCase()
                    console.log(options)
                    let data = await fetchData(options)
                    dataArray.push(data)
                }

            }
            else {
                let data = await fetchData(options)
                dataArray.push(data)
            }
        }
        if (dataArray != []) {
            dataArray = dataArray.toString()
            files.writeFile(outputFile, dataArray)
            exit()
        }
    }
    else {
        console.log(`
        ##  HELP  ##\n
        Modes:\n
        update : Updates the db with the new data from the graph (start and end options)
        Options:\n
        --start or -s to start from a specific index\n
        --end or -e to stop at a specific index`)
        exit()
    }
}


// initiate process and update data

async function start() {
    let HoneySwapinfo = await fetchHoneyswapInfo()
    console.log(HoneySwapinfo)

    let updatedInfo = (HoneySwapinfo) ? HoneySwapinfo.uniswapFactories[0] : (function () { throw "HoneySwapInfo failed to retrieve data" }());
    const pairCount = updatedInfo.pairCount;
    const txCount = updatedInfo.txCount;
    if (updatedInfo.pairCount > pairs.length) {
        await updateSavedPairs()
    }
    let lastTx = await getFromDB("Transaction", {}, 1, { blockNumber: -1 })
    startBlockNumber = startBlockNumber || lastTx[0].blockNumber - 1;
    endBlockNumber = endBlockNumber || startBlockNumber + 1000000;
    let totalQueries = endBlockNumber + 1 - startBlockNumber;
    console.log(startBlockNumber, endBlockNumber, totalQueries)
    //exit()

    // Build Threads

    if (threads && totalQueries > threads) {
        let threadQueries = Math.floor(totalQueries / threads) //queries made per thread  24/10 = 2 per 10 threads ... 
        for (let i = 1; i < threads + 1; i++) {

            if (i === threads) {
                graphQueryHandler(startBlockNumber + (threadQueries * (i - 1)), startBlockNumber + totalQueries)
            }
            else { graphQueryHandler(startBlockNumber + (threadQueries * (i - 1)), startBlockNumber + (threadQueries * i)) }
        }
    }
    else {
        await graphQueryHandler(startBlockNumber, endBlockNumber)
        exit()
    }

}


// find a query missing tx

async function fixMissing() {
    let errors = await getFromDB('Error', {}, 100, { index: 1 })
    for (let i = 0; i < errors.length; i++) {
        if (errors[i]) {
            await findOneAndDelete('Error', { index: errors[i].index })
            await graphQueryHandler(errors[i].index, errors[i].index)
        }
    }
    exit()
}

// fetch Db for data

async function fetchData(optionsInput) {
    let options = optionsInput
    let collection = (options.collection) ? options.collection : "Transaction";
    let limit = (options.limit) ? options.limit : 10000000;
    let sortBy = (options.sortBy) ? options.sortBy : "blockNumber";
    let sortDirection = (options.sortDirection) ? options.sortDirection : 1;
    let sort = { [sortBy]: sortDirection }
    let filterObj = (options.filter) ? filters.applyFilter(options.filter) : {}
    let data = await getFromDB(collection, filterObj, limit, sort)
    return JSON.stringify(data)


}

async function graphQueryHandler(start, end) {
    let startBlock = start;
    let endBlock = end;
    console.log(`Queries queued to be made to thegraph ${startBlock}`)
    let moreBlocks = true;
    while (moreBlocks && startBlock <= endBlock) {
        let data = await fetchTransactions(startBlock, endBlock)
        if (data['error']) {
            console.log(data['error']);
            findOrCreate('Error', { index: data.index }, data['error'])
        }
        else if (data['transactions']) {
            let txInfo = data['transactions']
            if (txInfo.length === 0) {
                moreBlocks = false;
            }
            else {
                console.log(startBlock)
                if (startBlock > endBlock || txInfo.length === 1) { moreBlocks = false }
                for (let j = 0; j < txInfo.length; j++) {
                    await findOrCreate('Transaction', { id: txInfo[j].id }, txInfo[j])
                }

                startBlock = txInfo[txInfo.length - 1].blockNumber;

            }
        }
        else {
            console.log(error);
            findOrCreate('Error', { index: data.index }, { index: data.index, log: 'fetchTransactions failed' })
        }
    }
    return

}


// exit process

function exit() {
    console.log("It's over yay!")
    setTimeout(() => process.exit(), 5000)

}


