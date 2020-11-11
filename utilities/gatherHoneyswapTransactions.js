const axios = require('axios');

const thegraph = "https://api.thegraph.com/subgraphs/name/1hive/uniswap-v2"
const files = require('./fileSystemInteraction.js')



async function updateSavedPairs() {
    let info = await fetchHoneyswapInfo()
    const pairCount = (info) ? info.uniswapFactories[0].pairCount : console.log("Could not fetch HoneyswapInfo for pair count")

    if (!isNaN(pairCount)) {
        let pairs = []
        for (let i = 0; i < (pairCount / 100); i++) {
            let data = await fetchPairs(i * 100)
            if (data.pairs != []) {
                pairs = pairs.concat(data.pairs)
            }
        }
        if (pairs != []) {
            let content = JSON.stringify(pairs)
            files.writeFile('pairs.json', content)
        }
    }
}


// FETCHING from SUBGRAPH // 

async function fetchTransactions(blockNumber) {
    if (!blockNumber ) {
        console.log("No skip parameter submitted");
        blockNumber  = 0
    }

    let errorLog = false

    let response = await axios.post(thegraph, {
        query: `{
            transactions(where: {blockNumber_gte: ${blockNumber}} , orderBy: blockNumber, orderDirection: asc) {
              id
              blockNumber
              mints {
                pair {
                    id
                    reserveUSD
                    reserve0
                    reserve1
                }
                timestamp
                to
                amount0
                amount1
              }
              swaps {
                pair {
                    id
                    reserveUSD
                    reserve0
                    reserve1
                }
                timestamp
                to
                amount0In
                amount1In
                amount0Out
                amount1Out
                amountUSD
              }
              burns {
                pair {
                    id
                    reserveUSD
                    reserve0
                    reserve1
                }
                timestamp
                liquidity
                sender
                amount0
                amount1
              }
            }
          }`
    })
        .then(res => {
            return res.data
        })
        .catch(function (error) {
            errorLog = error['message']
        });
    if (response.data) {
        return response.data;
    }
    else if(response.errors || errorLog){
        if (response.errors) return { error: { index: blockNumber , log: response.errors[0].message } }
        if (errorLog) return { error: { index: blockNumber , log: errorLog } }
    }
    return { error: { index: blockNumber , log: 'no response from promise' } }
}


async function fetchHoneyswapInfo() {
    let data = await axios.post(thegraph, {
        query: `{
            uniswapFactories{
              id
              txCount  
              pairCount
            }
          }`
    })
        .then(res => {
            let data = res.data.data
            return data
        })
        .catch(function (error) {
            console.log(error);
        });
    return data

}

async function fetchPairs(skip_count) {
    skip_count = (skip_count) ? skip_count : 0;
    let data = await axios.post(thegraph, {
        query: `{
            pairs(skip:${skip_count} orderBy:txCount, orderDirection:desc) {
              id
              txCount
              token0{
                  id
                  name
                  symbol
              }
              token1{
                  id
                  name
                  symbol
              }
            }
          }`
    })
        .then(res => {
            let data = res.data.data
            return data
        })
        .catch(function (error) {
            console.log(error);
        });
    return data

}

module.exports = {
    fetchHoneyswapInfo,
    fetchTransactions,
    fetchPairs,
    updateSavedPairs
};
