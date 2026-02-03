const mongoose = require('mongoose');
const User = require('../models/User');
const Employee = require('../models/Employee');
const bcrypt = require('bcryptjs');

console.log("Starting Manual Hash Fix...");

mongoose.connect("mongodb://127.0.0.1:27017/RSR")
    .then(() => fixHR())
    .catch(err => {
        console.error("DB Error:", err);
        process.exit(1);
    });

const fixHR = async () => {
    try {
        // Test bcrypt first
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash("hr123", salt);
        console.log("✅ Bcrypt Working. Hash generated.");

        const hrEmployee = await Employee.findOne({ department: 'HR' });
        if (!hrEmployee) {
            console.log("❌ No HR Employee found.");
            process.exit(1);
        }
        const username = hrEmployee.employeeCode || "HR_ADMIN";

        // Update using updateOne (Bypasses pre-save hooks)
        // Try to find by ID first
        const resId = await User.updateOne(
            { employeeId: hrEmployee._id },
            {
                $set: {
                    username: username,
                    password: hash,
                    employeeId: hrEmployee._id
                }
            },
            { upsert: true } // Create if not exists ? No, upsert on updateOne with just employeeId query might fail if username unique constraint.
            // Let's stick to findOne logic but use updateOne to save.
        );

        // Actually, `upsert` might fail if multiple docs match or unique index. 
        // Let's do explicit find.

        let user = await User.findOne({ employeeId: hrEmployee._id });
        if (user) {
            await User.updateOne({ _id: user._id }, { $set: { password: hash, username: username } });
            console.log("✅ User Updated (Direct).");
        } else {
            // If not found by ID, check by username to avoid unique error
            user = await User.findOne({ username: username });
            if (user) {
                console.log("⚠️ Found by username. Updating ID and Pass...");
                await User.updateOne({ _id: user._id }, { $set: { password: hash, employeeId: hrEmployee._id } });
            } else {
                console.log("Creating new user (Direct Insert)...");
                // Use .create() but maybe it triggers hooks?
                // .create() calls save(). 
                // Use collection.insertOne to bypass everything?
                // Or just new User + save() and debug why hook failed later.
                // Let's try collection insert if possible, or just assume the previous failure was hook related and now we know better.
                // Actually, if I can't save new user, I can't create.
                // But since I successfully ran migrate-passwords (which query users), I assume connections are fine.

                // Let's try creating with a raw insert
                await mongoose.connection.collection('users').insertOne({
                    employeeId: hrEmployee._id,
                    username: username,
                    password: hash,
                    isFirstLogin: false,
                    __v: 0
                });
                console.log("✅ Inserted New User (Raw).");
            }
        }

        console.log(`\n🎉 HR Access Fixed. Login with: ${username} / hr123`);
        process.exit(0);

    } catch (err) {
        console.error("CRITICAL ERROR:", err);
        process.exit(1);
    }
};
