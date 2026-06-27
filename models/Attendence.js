const mongoose = require("mongoose");
const createTenantModelProxy = require("../utils/tenantModel");

const attendenceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true
    },

    date: {
      type: String, // YYYY-MM-DD
      required: true
    },

    punchIn: Date,
    punchOut: Date,

    punchInLocation: {
      lat: Number,
      lng: Number,
      address: String
    },

    punchOutLocation: {
      lat: Number,
      lng: Number
    },

    totalHours: {
      type: Number,
      default: 0
    },

    totalMinutes: {
      type: Number,
      default: 0
    },

    workDuration: {
      type: String,
      default: "0h 0m"
    },
    workFromHome: { type: Boolean, default: false },
    wfhReason: { type: String, default: null }
  },
  { timestamps: true }
);

attendenceSchema.index(
  { employeeId: 1, date: 1 },
  { unique: true }
);

module.exports = createTenantModelProxy("Attendence", attendenceSchema);
