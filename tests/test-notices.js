const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const Announcement = require("../models/Announcement");

async function testNotices() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("🔍 Testing Announcement / Notice Board API logic...");

    // 1. Create a Notice / Announcement
    const testNotice = new Announcement({
      title: "Quarterly Townhall Meeting",
      message: "All employees are invited to the Q3 Townhall meeting on Friday at 4 PM.",
      department: "ALL",
      date: new Date()
    });
    await testNotice.save();
    console.log(`✅ Notice posted: "${testNotice.title}" (ID: ${testNotice._id})`);

    // 2. Query Notices
    const notices = await Announcement.find({}).sort({ date: -1 });
    console.log(`✅ Total Notices in database: ${notices.length}`);

    // Cleanup
    await Announcement.findByIdAndDelete(testNotice._id);
    console.log("✅ Test notice cleaned up.");

    process.exit(0);
  } catch (err) {
    console.error("❌ Notice test error:", err);
    process.exit(1);
  }
}

testNotices();
