const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema({

    rejectionReason: {
      type: String,
      default: null
    },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true
  },
  department: {
    type: String,
    required: true
  },

  leaveType: {
    type: String,
    enum: ["Casual", "Sick", "Earned", "LOP"],
    required: true
  },

  fromDate: {
    type: String,
    required: true
  },

  toDate: {
    type: String,
    required: true
  },

  totalDays: {
    type: Number,
    required: true
  },

  reason: {
    type: String,
    required: true
  },

  status: {
    type: String,
    enum: ["PENDING", "APPROVED", "REJECTED"],
    default: "PENDING"
  },

  appliedAt: {
    type: Date,
    default: Date.now
  },

  actionBy: {
    type: String, // HR name / ID
    default: null
  },

  actionAt: {
    type: Date,
    default: null
  },


 

});

module.exports = mongoose.model("Leave", leaveSchema);



