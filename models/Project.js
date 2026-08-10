const mongoose = require("mongoose");
const createTenantModelProxy = require("../utils/tenantModel");

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    client: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ["Active", "Completed"],
      default: "Active"
    },
    deadline: {
      type: Date,
      default: null
    },
    departments: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true
  }
);

module.exports = createTenantModelProxy("Project", projectSchema);
