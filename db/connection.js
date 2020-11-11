// mongoose - Database

const mongoose = require('mongoose');
const dotenv = require('../app.js');
const dbURL =  process.env.MONGODB_URI || "mongodb://localhost/tulip-analytics";
mongoose.connect(dbURL, { useNewUrlParser: true, useUnifiedTopology: true,useFindAndModify: false  });



const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {

});


