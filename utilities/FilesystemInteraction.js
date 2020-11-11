const fs = require('fs');


function processData(buf) {
    let content = buf.toString()
    return content
}

async function writeFile(file_name, contentToSave) {
    let file_path = __dirname + "/../storage/" + file_name

    fs.writeFile(file_path, contentToSave, (err) => {
        // throws an error, you could also catch it here
        if (err) throw err;

        // success case, the file was saved
        console.log('Saved content into ', file_name);
    });
}

function readFile(file_name) {
    let file_path = __dirname + "/../storage/" + file_name
    fs.readFile(file_path, function read(err, data) {
        // throws an error, you could also catch it here
        if (err) throw err;

        // success case, the file was saved
        const content = data;
        processData(content)
    })
}

module.exports = { readFile, writeFile }