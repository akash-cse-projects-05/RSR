const mongoose = require("mongoose");
const createTenantModelProxy = require("../utils/tenantModel");

const trainingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ["Compliance", "Technical", "Soft Skills", "Safety", "Onboarding"],
    default: "Technical"
  },
  targetDepartment: {
    type: String,
    default: "ALL"
  },
  contentType: {
    type: String,
    enum: ["Video", "Document", "Interactive"],
    default: "Document"
  },
  contentUrl: {
    type: String,
    required: true
  },
  durationMinutes: {
    type: Number,
    default: 30
  },
  assignedEmployees: [{
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    status: { type: String, enum: ["Pending", "Completed"], default: "Pending" },
    completedAt: { type: Date, default: null }
  }]
}, {
  timestamps: true
});

module.exports = createTenantModelProxy("Training", trainingSchema);
