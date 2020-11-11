
function applyFilter(filterOptions) {
    let vars = filterOptions.vars
    let filterName = filterOptions.filterName;
    // console.log(vars)
    switch (filterName) {
        case 'blockRange':
            { $and: [{ "blockNumber": { $lte: vars.blockFloor } }, { "blockNumber": { $gte: vars.blockCeil } }] }
        case 'blockCeil':
            return { "blockNumber": { $lte: vars.blockFloor } }
            
        case 'mintsAll':
            return { "mints": { $not: { $size: 0 } } }

        case 'swapsAll':
            return { "swaps": { $not: { $size: 0 } } }

        case 'burnsAll':
            return { "burns": { $not: { $size: 0 } } }

        case 'liquidityProviding':
            return { $or: [{ "mints": { $not: { $size: 0 } } }, { "burns": { $not: { $size: 0 } } }] }

        case 'pair':
            return { $or: [{ "mints.pair.id": { $eq: vars.pairAddress } }, { "burns.pair.id": { $eq: vars.pairAddress } }, { "swaps.pair.id": { $eq: vars.pairAddress } }] }

        case 'pairSwaps':
            return { "swaps.pair.id": { $eq: vars.pairAddress } }

        case 'pairLP':
            return { $or: [{ "mints.pair.id": { $eq: vars.pairAddress } }, { "burns.pair.id": { $eq: vars.pairAddress } }] }

        case 'PairSwapsBetweenTimestamp':
            return { $and: [{ "swaps.pair.id": { $eq: vars.pairAddress } }, { "swaps.timestamp": { $gte: vars.lowerTimestamp } }, { "swaps.timestamp": { $lte: vars.higherTimestamp } }] }

        case 'AllBetweenTimestamp':
            return { $and: [{ "swaps.timestamp": { $gte: vars.lowerTimestamp } }, { "swaps.timestamp": { $lte: vars.higherTimestamp } }] }
    }


}

module.exports = { applyFilter }