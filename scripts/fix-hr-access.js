const mongoose = require('mongoose');
const User = require('../models/User');
const Employee = require('../models/Employee');
const bcrypt = require('bcryptjs');

console.log("Starting HR Access Fix Script...");

mongoose.set('strictQuery', false); // Optional: in case of strict query issues

mongoose.connect("mongodb://127.0.0.1:27017/RSR")
    .then(() => {
        console.log("MongoDB connected successfully");
        checkHR();
    })
    .catch(err => {
        console.error("MongoDB connection error:", err);
        process.exit(1);
    });

const checkHR = async () => {
    try {
        console.log("Searching for HR Employee...");
        const hrEmployee = await Employee.findOne({ department: 'HR' });

        if (!hrEmployee) {
            console.log("❌ No Employee found with department 'HR'.");
            console.log("Listing available departments to debug:");
            const depts = await Employee.distinct('department');
            console.log("Active Departments:", depts);
            process.exit(1);
        }

        console.log("✅ HR Employee Object Found.");
        console.log("ID:", hrEmployee._id);
        console.log("Name:", hrEmployee.firstName, hrEmployee.lastName);
        console.log("Code:", hrEmployee.employeeCode);

        const username = hrEmployee.employeeCode || "HR_ADMIN";

        console.log(`Checking User record for EmployeeID: ${hrEmployee._id}`);
        let user = await User.findOne({ employeeId: hrEmployee._id });

        if (!user) {
            console.log("⚠️ User record missing. Creating...");
            user = new User({
                employeeId: hrEmployee._id,
                username: username,
                password: "hr123",
                isFirstLogin: false
            });
            await user.save();
            console.log("✅ Created User record.");
        } else {
            console.log("✅ User record found:", user.username);
            user.password = "hr123";
            user.username = username; // Ensure username matches
            await user.save();
            console.log("✅ Password reset to 'hr123'");
        }

        console.log(`\n🎉 DONE. Username: ${user.username}, Password: hr123`);
        process.exit(0);

    } catch (err) {
        console.error("Runtime Error:", err);
        process.exit(1);
    }
};
