const mongoose = require('mongoose');

// Schema

const ErrorSchema = new mongoose.Schema({
    index: Number,
    log: String,
});

module.exports = mongoose.model('Error', ErrorSchema);
