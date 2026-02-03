const mongoose = require('mongoose');
const Employee = require('../models/Employee');

// Connect to DB (Using correct URI from app.js)
mongoose.connect('mongodb://127.0.0.1:27017/RSR')
    .then(async () => {
        console.log('Connected to DB');

        // 1. Find all unique designations
        const designations = await Employee.distinct('designation');
        console.log('All Designations found in DB:', designations);

        // 2. Find employees who should be managers
        const managers = await Employee.find({ designation: { $regex: /manager/i } }, 'firstName lastName designation department email');
        console.log('\nEmployees with "Manager" in designation:', managers);

        // 3. Count exact matches for "MANAGER"
        const exactManagers = await Employee.countDocuments({ designation: 'MANAGER' });
        console.log('\nExact "MANAGER" count:', exactManagers);

        process.exit();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
