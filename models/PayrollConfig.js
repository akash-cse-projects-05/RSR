const mongoose = require('mongoose');
const createTenantModelProxy = require("../utils/tenantModel");

const payrollConfigSchema = new mongoose.Schema({
    taxRules: [{
        minIncome: Number,
        percentage: Number
    }],
    pfPercentage: { type: Number, default: 0 }, // e.g. 12%
    ptAmount: { type: Number, default: 0 }, // e.g. 200
    updatedAt: { type: Date, default: Date.now }
});

module.exports = createTenantModelProxy('PayrollConfig', payrollConfigSchema);
