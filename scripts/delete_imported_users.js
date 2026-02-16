const mongoose = require('mongoose');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const dbURI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/RSR";

mongoose.connect(dbURI)
    .then(() => {
        console.log('MongoDB connected');
        deleteData();
    })
    .catch(err => {
        console.error('MongoDB error:', err);
        process.exit(1);
    });

const deleteData = async () => {
    try {
        // Read the original source file to know which users to delete
        const jsonPath = path.join(__dirname, '../DATA/RSR.users.json');
        if (!fs.existsSync(jsonPath)) {
            console.error('RSR.users.json not found!');
            process.exit(1);
        }

        const rawData = fs.readFileSync(jsonPath, 'utf8');
        const users = JSON.parse(rawData);

        // Extract usernames to identify records to delete
        const usernames = users.map(u => u.username);
        console.log(`Found ${usernames.length} usernames in source file to check for deletion.`);

        const result = await User.deleteMany({ username: { $in: usernames } });
        console.log(`Successfully deleted ${result.deletedCount} users from the database.`);

        process.exit(0);
    } catch (err) {
        console.error('Error during deletion:', err);
        process.exit(1);
    }
};
