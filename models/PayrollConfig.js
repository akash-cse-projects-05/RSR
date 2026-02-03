const mongoose = require('mongoose');

const payrollConfigSchema = new mongoose.Schema({
    taxRules: [{
        minIncome: Number,
        percentage: Number
    }],
    // Global settings for allowances/deductions can go here
    pfPercentage: { type: Number, default: 0 }, // e.g. 12%
    ptAmount: { type: Number, default: 0 }, // e.g. 200
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PayrollConfig', payrollConfigSchema);
