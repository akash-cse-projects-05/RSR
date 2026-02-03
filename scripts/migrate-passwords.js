const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

mongoose.connect("mongodb://127.0.0.1:27017/RSR")
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.error("MongoDB error:", err));

const migratePasswords = async () => {
    try {
        const users = await User.find({});
        console.log(`Found ${users.length} users to migrate.`);

        for (const user of users) {
            // Check if password looks like a bcrypt hash (starts with $2a$ or $2b$)
            if (!user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
                console.log(`Migrating password for user: ${user.username}`);

                // Hash the plain text password
                // The pre-save hook in User.js handles hashing, BUT we need to be careful.
                // If we just save, the pre-save hook might hash it again if we set it.
                // Let's rely on the pre-save hook by just marking it modified? 
                // Actually, the pre-save hook checks `isModified('password')`.
                // If we assign user.password = user.password, it might not count as modified.
                // Let's manually hash here to be safe and avoid double hashing ambiguity with the hook logic.

                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(user.password, salt);

                // Determine if we should update via updateOne to bypass pre-save hook or just save
                // To be simpler and safer against schema changes, let's update directly.

                await User.updateOne({ _id: user._id }, { $set: { password: hashedPassword } });
                console.log(`Updated ${user.username}`);
            } else {
                console.log(`Skipping already hashed password for: ${user.username}`);
            }
        }

        console.log("Migration complete.");
        process.exit(0);
    } catch (err) {
        console.error("Migration error:", err);
        process.exit(1);
    }
};

migratePasswords();
