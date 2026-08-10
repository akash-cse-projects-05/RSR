const mongoose = require("mongoose");
const createTenantModelProxy = require("../utils/tenantModel");

const ticketSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true
  },
  employeeName: {
    type: String,
    required: true
  },
  targetDepartment: {
    type: String,
    enum: ["IT", "HR", "Finance", "Admin"],
    required: true
  },
  category: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  priority: {
    type: String,
    enum: ["Low", "Medium", "High", "Urgent"],
    default: "Medium"
  },
  status: {
    type: String,
    enum: ["Open", "In Progress", "Resolved", "Closed"],
    default: "Open"
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    default: null
  },
  resolutionNotes: {
    type: String,
    default: null
  },
  comments: [{
    postedBy: String,
    role: String,
    text: String,
    createdAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

module.exports = createTenantModelProxy("Ticket", ticketSchema);
