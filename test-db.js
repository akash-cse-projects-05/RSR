require("dotenv").config();
const mongoose = require("mongoose");

async function testConnection() {
  try {
    console.log("Connecting to:", process.env.MONGODB_URI);
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    console.log("✅ Successfully connected to MongoDB.");
    
    // Try a simple query
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log("✅ Collections found:", collections.map(c => c.name));
    
    process.exit(0);
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
}

testConnection();
