const mongoose = require('mongoose');
const User = require('../models/User'); // Adjust path as needed
const path = require('path');
const data = require('../DATA/data');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });


const dbURI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/RSR"; // Fallback if local

mongoose.connect(dbURI)
    .then(() => {
        console.log('MongoDB connected');
        insertData();
    })
    .catch(err => {
        console.error('MongoDB error:', err);
        process.exit(1);
    });

const insertData = async () => {
    try {
        let successCount = 0;
        let errorCount = 0;

        for (const userData of data) {
            try {
                // Check if user already exists
                const existingUser = await User.findOne({
                    $or: [{ username: userData.username }, { _id: userData._id }]
                });

                if (existingUser) {
                    console.log(`Skipping existing user: ${userData.username}`);
                    continue;
                }

                // Create new user instance
                // This triggers the pre('save') hook to hash the password
                const newUser = new User(userData);
                await newUser.save();

                console.log(`Inserted user: ${userData.username}`);
                successCount++;
            } catch (err) {
                console.error(`Error inserting ${userData.username}:`, err.message);
                errorCount++;
            }
        }

        console.log('\n--- Summary ---');
        console.log(`Successfully inserted: ${successCount}`);
        console.log(`Errors/Skipped: ${data.length - successCount}`);
        console.log(`Total processed: ${data.length}`);

        process.exit(0);
    } catch (err) {
        console.error('Fatal error:', err);
        process.exit(1);
    }
};
