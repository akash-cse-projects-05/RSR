const mongoose = require("mongoose");
const createTenantModelProxy = require("../utils/tenantModel");

const shiftSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    startTime: {
      type: String, // format "HH:MM", e.g. "09:00"
      required: true
    },
    endTime: {
      type: String, // format "HH:MM", e.g. "17:00"
      required: true
    },
    gracePeriod: {
      type: Number, // in minutes, e.g. 15
      default: 15
    },
    breakDuration: {
      type: Number, // in minutes, e.g. 60
      default: 60
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active"
    }
  },
  {
    timestamps: true
  }
);

module.exports = createTenantModelProxy("Shift", shiftSchema);
