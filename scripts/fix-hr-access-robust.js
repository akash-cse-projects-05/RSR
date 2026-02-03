const mongoose = require('mongoose');
const User = require('../models/User');
const Employee = require('../models/Employee');
const bcrypt = require('bcryptjs');

console.log("Starting Robust HR Fix...");

mongoose.connect("mongodb://127.0.0.1:27017/RSR")
    .then(() => checkHR())
    .catch(err => {
        console.error("DB Error:", err);
        process.exit(1);
    });

const checkHR = async () => {
    try {
        const hrEmployee = await Employee.findOne({ department: 'HR' });
        if (!hrEmployee) {
            console.log("❌ No HR Employee found.");
            process.exit(1);
        }

        const username = hrEmployee.employeeCode || "HR_ADMIN";
        console.log(`Target: ${hrEmployee.firstName} (${hrEmployee._id}) -> Username: ${username}`);

        // 1. Check by ID
        let userById = await User.findOne({ employeeId: hrEmployee._id });

        // 2. Check by Username
        let userByName = await User.findOne({ username: username });

        if (userById) {
            console.log("✅ User found by ID.");
            userById.username = username;
            userById.password = "hr123";
            await userById.save();
            console.log("✅ Updated User by ID.");
        } else if (userByName) {
            console.log("⚠️ User found by Username (but different ID). Linking to HR ID...");
            userByName.employeeId = hrEmployee._id;
            userByName.password = "hr123";
            await userByName.save();
            console.log("✅ Updated User by Name.");
        } else {
            console.log("⚠️ No User found. Creating new...");
            const newUser = new User({
                employeeId: hrEmployee._id,
                username: username,
                password: "hr123"
            });
            await newUser.save();
            console.log("✅ Created New User.");
        }

        console.log("\n🎉 SUCCESS. HR Login: " + username + " / hr123");
        process.exit(0);

    } catch (err) {
        console.error("CRITICAL ERROR:", err);
        process.exit(1);
    }
};
