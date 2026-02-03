const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const fs = require('fs');

mongoose.connect('mongodb://127.0.0.1:27017/RSR')
    .then(async () => {
        let output = '';

        const designations = await Employee.distinct('designation');
        output += `Designations: ${JSON.stringify(designations)}\n`;

        const managers = await Employee.find({ designation: { $regex: /manager/i } }, 'firstName lastName designation email');
        output += `Managers Found: ${JSON.stringify(managers, null, 2)}\n`;

        const exactCount = await Employee.countDocuments({ designation: 'MANAGER' });
        output += `Exact 'MANAGER' count: ${exactCount}\n`;

        fs.writeFileSync('manager-audit.txt', output);
        console.log('Done writing to manager-audit.txt');
        process.exit();
    })
    .catch(err => {
        fs.writeFileSync('manager-audit.txt', `Error: ${err.message}`);
        process.exit(1);
    });
