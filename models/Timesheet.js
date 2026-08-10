const mongoose = require("mongoose");
const createTenantModelProxy = require("../utils/tenantModel");

const timesheetSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    hoursWorked: {
      type: Number,
      required: true,
      min: 0.5,
      max: 24
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ["Submitted", "Approved"],
      default: "Submitted"
    }
  },
  {
    timestamps: true
  }
);

module.exports = createTenantModelProxy("Timesheet", timesheetSchema);
