const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    type: {
        type: String,
        enum: ['Travel', 'Food', 'Lodging', 'Miscellaneous'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    description: {
        type: String,
        required: true
    },
    receiptPath: {
        type: String, // Path to uploaded file
        default: null
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    location: {
        lat: { type: Number },
        lng: { type: Number },
        address: { type: String } // Optional text address
    },
    rejectionReason: {
        type: String,
        default: null
    },
    hrActionBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Expense', expenseSchema);
