const mongoose = require("mongoose");
const createTenantModelProxy = require("../utils/tenantModel");

const appraisalSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true
    },
    cycleName: {
      type: String,
      required: true, // e.g. "Annual Performance Review 2026"
      trim: true
    },
    selfRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    selfComments: {
      type: String,
      trim: true
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null
    },
    managerRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    managerComments: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ["Self-Appraisal", "Manager-Review", "Completed"],
      default: "Self-Appraisal"
    }
  },
  {
    timestamps: true
  }
);

module.exports = createTenantModelProxy("Appraisal", appraisalSchema);
