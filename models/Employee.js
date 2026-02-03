const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    /* ======================
       BASIC IDENTIFICATION
    ====================== */

    employeeCode: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    firstName: {
      type: String,
      required: true,
      trim: true
    },

    lastName: {
      type: String,
      trim: true
    },

    dob: {
      type: Date,
      required: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true
    },

    phoneNumber: {
      type: String,
      required: true
    },

    address: {
      type: String,
      default: "Not Provided"
    },

    leaveBalance: {
      type: Number,
      default: 25
    },

    lopCount: {
      type: Number,
      default: 0
    },

    lopDaysThisMonth: {
      type: Number,
      default: 0
    },

    /* ======================
       JOB DETAILS
    ====================== */

    salary: {
      type: Number,
      default: 0
    },
    hra: {
      type: Number,
      default: 0
    },
    travelAllowance: {
      type: Number,
      default: 0
    },
    otherAllowances: {
      type: Number,
      default: 0
    },
    pf: {
      type: Number,
      default: 0
    },
    professionalTax: {
      type: Number,
      default: 0
    },
    incomeTax: {
      type: Number,
      default: 0
    },

    department: {
      type: String,
      required: true
    },

    designation: {
      type: String,
      required: true
    },

    employmentType: {
      type: String,
      enum: ["Full-Time", "Part-Time", "Contract", "Intern"],
      default: "Full-Time"
    },

    joiningDate: {
      type: Date,
      required: true
    },

    reportingManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null
    },

    workLocation: {
      type: String,
      default: "Hyderabad"
    },

    /* ======================
       SYSTEM STATUS
    ====================== */

    status: {
      type: String,
      enum: ["Active", "Inactive", "Resigned"],
      default: "Active"
    },

    /* ======================
       HR / AUDIT INFO
    ====================== */
    // remainingLeaves: {
    //     type: Number,
    //     default: 25
    //   },
    createdByHR: {
      type: Boolean,
      default: true
    },

    /* ======================
       BANK DETAILS
    ====================== */
    bankDetails: {
      accountNumber: { type: String, default: null },
      ifscCode: { type: String, default: null },
      bankName: { type: String, default: null },
      branchName: { type: String, default: null },
      aadharNumber: { type: String, default: null }
    },

    /* ======================
       LOCATION TRACKING
    ====================== */
    lastKnownLocation: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      timestamp: { type: Date, default: null },
      address: { type: String, default: null }
    },

    /* ======================
       PROFILE PHOTO
    ====================== */
    profilePhoto: {
      data: Buffer,
      contentType: String
    },

    /* ======================
       WFH SCHEDULE
    ====================== */
    wfhSchedule: {
      startDate: { type: Date, default: null },
      endDate: { type: Date, default: null },
      reason: { type: String, default: null },
      allottedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null }
    },

    /* ======================
       RESIGNATION DETAILS
    ====================== */
    resignationStatus: {
      type: String,
      enum: ['Pending', 'Revoked', 'Approved', 'Rejected', null],
      default: null
    },
    resignationDate: {
      type: Date,
      default: null
    },
    resignationReason: {
      type: String,
      default: null
    }
  },

  {
    timestamps: true // createdAt, updatedAt
  }
);

module.exports = mongoose.model("Employee", employeeSchema);



