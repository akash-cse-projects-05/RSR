const mongoose = require("mongoose");
const createTenantModelProxy = require("../utils/tenantModel");

const goalSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    targetDate: {
      type: Date,
      required: true
    },
    progress: {
      type: Number, // Percentage from 0 to 100
      default: 0,
      min: 0,
      max: 100
    },
    status: {
      type: String,
      enum: ["Draft", "Active", "Achieved", "Deferred"],
      default: "Active"
    },
    keyResults: [
      {
        text: { type: String, required: true },
        completed: { type: Boolean, default: false }
      }
    ]
  },
  {
    timestamps: true
  }
);

module.exports = createTenantModelProxy("Goal", goalSchema);


