const mongoose = require('mongoose');

console.log("1. Starting");

mongoose.connect("mongodb://127.0.0.1:27017/RSR")
    .then(async () => {
        console.log("2. Connected");

        try {
            console.log("3. Loading Employee Model...");
            const Employee = require('../models/Employee');
            console.log("4. Finding HR...");
            const hr = await Employee.findOne({ department: 'HR' });
            console.log("5. HR Found:", hr ? hr.firstName : "None");

            console.log("6. Loading User Model...");
            const User = require('../models/User');

            if (hr) {
                console.log("7. Checking User...");

                // Fallback username
                const username = hr.employeeCode || "HR_ADMIN";

                let user = await User.findOne({ employeeId: hr._id });
                if (!user) {
                    console.log("8. Creating User...");
                    user = new User({
                        employeeId: hr._id,
                        username: username,
                        password: "hr123"
                    });
                } else {
                    console.log("8. Updating User...");
                    user.password = "hr123";
                    user.username = username;
                }

                await user.save();
                console.log("9. Saved.");
            }

            process.exit(0);
        } catch (e) {
            console.error("ERROR:", e);
            process.exit(1);
        }
    })
    .catch(err => {
        console.error("CONN ERROR:", err);
        process.exit(1);
    });
