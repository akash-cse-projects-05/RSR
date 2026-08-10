const mongoose = require("mongoose");

try {
  const schema = new mongoose.Schema({ name: String });
  console.log("Compiling schema test...");
  mongoose.connection.model("EmployeeTest", schema);
  console.log("✅ Successfully compiled schema on connection.");
} catch (err) {
  console.error("❌ Error:", err);
}
