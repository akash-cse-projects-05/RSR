const mongoose = require('mongoose');

console.log("1. Starting script...");
mongoose.connect("mongodb://127.0.0.1:27017/RSR")
    .then(() => {
        console.log("2. Connected to DB");
        process.exit(0);
    })
    .catch(err => {
        console.log("2. Connection Failed", err);
        process.exit(1);
    });
