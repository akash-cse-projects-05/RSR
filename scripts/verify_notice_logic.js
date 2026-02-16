const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const dbURI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/RSR";

async function testNoticeBoardLogic() {
    try {
        await mongoose.connect(dbURI);
        console.log('Connected to DB');

        const today = new Date();
        const month = today.getMonth() + 1;
        const day = today.getDate();

        console.log(`Checking for date: ${today.toISOString()} (Month: ${month}, Day: ${day})`);

        // 1. Today's Birthdays
        const todaysBirthdays = await Employee.find({
            $expr: {
                $and: [
                    { $eq: [{ $dayOfMonth: "$dob" }, day] },
                    { $eq: [{ $month: "$dob" }, month] }
                ]
            }
        });
        console.log(`Today's Birthdays (${todaysBirthdays.length}):`, todaysBirthdays.map(e => `${e.firstName} (${e.dob})`));

        // 2. Upcoming Birthdays (Next 10 days)
        const allEmployees = await Employee.find({ status: 'Active' });
        const upcomingBirthdays = allEmployees.filter(emp => {
            if (!emp.dob) return false;
            const dob = new Date(emp.dob);
            const todayDate = new Date();
            todayDate.setHours(0, 0, 0, 0);

            let nextB = new Date(todayDate.getFullYear(), dob.getMonth(), dob.getDate());
            if (nextB < todayDate) {
                nextB.setFullYear(todayDate.getFullYear() + 1);
            }

            const diffTime = nextB - todayDate;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            return diffDays > 0 && diffDays <= 10;
        });
        console.log(`Upcoming Birthdays (${upcomingBirthdays.length}):`, upcomingBirthdays.map(e => `${e.firstName} (${e.dob})`));

        // 3. New Joiners (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        console.log(`Checking joiners since: ${thirtyDaysAgo.toISOString()}`);

        const newJoiners = await Employee.find({
            joiningDate: { $gte: thirtyDaysAgo }
        }).sort({ joiningDate: -1 });

        console.log(`New Joiners (${newJoiners.length}):`, newJoiners.map(e => `${e.firstName} (Joined: ${e.joiningDate})`));

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

testNoticeBoardLogic();
