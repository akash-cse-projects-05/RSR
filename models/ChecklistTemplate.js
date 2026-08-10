const mongoose = require("mongoose");
const createTenantModelProxy = require("../utils/tenantModel");

const checklistTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
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
          required: true,
          trim: true
        },
        assignedRole: {
          type: String,
          enum: ["HR", "IT", "Finance", "Manager", "Employee"],
          default: "HR"
        }
      }
    ]
  },
  {
    timestamps: true
  }
);

module.exports = createTenantModelProxy("ChecklistTemplate", checklistTemplateSchema);
