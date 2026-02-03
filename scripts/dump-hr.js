const mongoose = require('mongoose');

console.log("Starting Dump...");
mongoose.connect("mongodb://127.0.0.1:27017/RSR")
    .then(async () => {
        try {
            const Employee = require('../models/Employee');
            const hr = await Employee.findOne({ department: 'HR' });
            console.log("HR DATA:", JSON.stringify(hr, null, 2));
            process.exit(0);
        } catch (e) {
            console.log(e);
            process.exit(1);
        }
    });
