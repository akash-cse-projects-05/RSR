const mongoose = require('mongoose');
const User = require('../models/User');
const Employee = require('../models/Employee');
const bcrypt = require('bcryptjs');

console.log("Starting Bulk HR Fix...");

mongoose.connect("mongodb://127.0.0.1:27017/RSR")
    .then(() => fixAllHRs())
    .catch(err => {
        console.error("DB Error:", err);
        process.exit(1);
    });

const fixAllHRs = async () => {
    try {
        // 1. Generate Hash
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash("hr123", salt);
        console.log("✅ Password Hash Generated for 'hr123'");

        // 2. Find ALL HR Employees
        const hrEmployees = await Employee.find({ department: 'HR' });

        if (hrEmployees.length === 0) {
            console.log("❌ No HR Employees found in database.");
            process.exit(0);
        }

        console.log(`found ${hrEmployees.length} HR Employees.`);

        for (const emp of hrEmployees) {
            const username = emp.employeeCode || `HR_${emp._id}`;
            console.log(`Processing: ${emp.firstName} ${emp.lastName} (${username})`);

            // Check if user exists by ID
            let user = await User.findOne({ employeeId: emp._id });

            if (user) {
                // Update existing
                await User.updateOne(
                    { _id: user._id },
                    { $set: { password: hash, username: username } }
                );
                console.log(`   -> Updated existing user record.`);
            } else {
                // Check if username taken by someone else (unlikely but possible)
                let userByName = await User.findOne({ username: username });
                if (userByName) {
                    console.log(`   -> Username '${username}' exists but linked to different ID. Relinking...`);
                    await User.updateOne(
                        { _id: userByName._id },
                        { $set: { employeeId: emp._id, password: hash } }
                    );
                } else {
                    // Create new
                    await mongoose.connection.collection('users').insertOne({
                        employeeId: emp._id,
                        username: username,
                        password: hash,
                        isFirstLogin: false,
                        __v: 0
                    });
                    console.log(`   -> Created NEW user record.`);
                }
            }
        }

        console.log("\n🎉 All HR accounts fixed. Password is 'hr123' for everyone.");
        process.exit(0);

    } catch (err) {
        console.error("CRITICAL ERROR:", err);
        process.exit(1);
    }
};
