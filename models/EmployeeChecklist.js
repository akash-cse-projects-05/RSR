const mongoose = require("mongoose");
const createTenantModelProxy = require("../utils/tenantModel");

const employeeChecklistSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true
    },
    type: {
      type: String,
      enum: ["Onboarding", "Offboarding"],
      required: true
    },
    tasks: [
      {
        taskTitle: {
          type: String,
          required: true
        },
        assignedRole: {
          type: String,
          enum: ["HR", "IT", "Finance", "Manager", "Employee"],
          default: "HR"
        },
        status: {
          type: String,
          enum: ["Pending", "Completed"],
          default: "Pending"
        },
        completedAt: {
          type: Date,
          default: null
        },
        completedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Employee",
          default: null
        }
      }
    ]
  },
  {
    timestamps: true
  }
);

module.exports = createTenantModelProxy("EmployeeChecklist", employeeChecklistSchema);
