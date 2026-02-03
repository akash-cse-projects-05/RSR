const mongoose = require('mongoose');

const PayslipSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  month: {
    type: Number,
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  basicSalary: {
    type: Number,
    required: true
  },
  hra: {
    type: Number,
    default: 0
  },
  travelAllowance: {
    type: Number,
    default: 0
  },
  otherAllowances: { // Miscellaneous allowances
    type: Number,
    default: 0
  },
  allowances: { // Deprecated/Total allowances if needed, but we will mostly use the breakdown
    type: Number,
    default: 0
  },
  reimbursements: {
    type: Number,
    default: 0
  },
  deductions: { // Manual/Other deductions
    type: Number,
    default: 0
  },
  deductionDetails: {
    type: [
      {
        type: { type: String }, // e.g., 'LOP', 'GST', 'Manual'
        label: String, // e.g., 'Loss of Pay for 2 days'
        amount: Number
      }
    ],
    default: []
  },
  lopDays: {
    type: Number,
    default: 0
  },
  bonuses: {
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
  taxes: { // Kept for backward compatibility or income tax if different from PT
    type: Number,
    default: 0
  },
  netPay: {
    type: Number,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['Paid', 'Not Yet Paid'],
    default: 'Not Yet Paid'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Payslip', PayslipSchema);
