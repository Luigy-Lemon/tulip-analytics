const mongoose = require('mongoose');

// Schema

const TransactionSchema = new mongoose.Schema({
    id: String,
    blockNumber: Number,
    page:Number,
    mints: [{
        pair: [{
            id: String,
            reserveUSD: Number,
        }],
        timestamp: Number,
        to: String,
        amount0: Number,
        amount1: Number,
    }],
    swaps: [{
        pair: [{
            id:String,
            reserveUSD:Number,
            reserve0:Number,
            reserve1:Number,
        }],
        timestamp:Number,
        to:String,
        amount0In:Number,
        amount1In:Number,
        amount0Out:Number,
        amount1Out:Number,
        amountUSD:Number,
    }],
    burns: [{
        pair: [{
            id:String,
            reserveUSD:Number,
        }],
        timestamp:Number,
        sender:String,
        amount0:Number,
        amount1:Number,
    }]
});

module.exports = mongoose.model('Transaction', TransactionSchema);
