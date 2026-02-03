const mongoose = require("mongoose");

const regularizationSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  reason: { type: String, required: true },
  status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
  createdAt: { type: Date, default: Date.now }
});

regularizationSchema.index({ employeeId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Regularization", regularizationSchema);