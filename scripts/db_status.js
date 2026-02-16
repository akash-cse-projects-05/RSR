const mongoose = require('mongoose');
const User = require('../models/User');
const Employee = require('../models/Employee');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const dbURI = process.env.MONGODB_URI;

async function checkDB() {
    try {
        await mongoose.connect(dbURI);
        console.log('Connected to DB');

        const userCount = await User.countDocuments();
        const empCount = await Employee.countDocuments();

        const fs = require('fs');
        const output = `
Total Users: ${userCount}
Total Employees: ${empCount}
Sample Employee: ${JSON.stringify(sampleEmp, null, 2)}
Sample User: ${JSON.stringify(sampleUser, null, 2)}
        `;
        fs.writeFileSync(path.join(__dirname, '../DATA/db_status_output.txt'), output);
        console.log('Status written to DATA/db_status_output.txt');

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkDB();
