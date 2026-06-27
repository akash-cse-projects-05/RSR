const mongoose = require("mongoose");

try {
  const schema = new mongoose.Schema({ name: String });
  console.log("Compiling on mongoose.connection...");
  mongoose.connection.model("Employee", schema);
  console.log("✅ Successfully compiled on mongoose.connection.");
  
  console.log("Accessing mongoose.model('Employee')...");
  const model = mongoose.model("Employee");
  console.log("✅ Successfully retrieved from mongoose.model.");
} catch (err) {
  console.error("❌ Error:", err);
}
