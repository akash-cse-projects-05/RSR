const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    source: {
        type: String,
        required: true
    },
    destination: {
        type: String,
        required: true
    },
    purpose: {
        type: String,
        required: true
    },
    estimatedCost: {
        type: Number,
        default: 0
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'In Progress', 'Rejected', 'Completed'],
        default: 'Pending'
    },
    rejectionReason: {
        type: String,
        default: null
    },
    destinationCoordinates: {
        lat: Number,
        lng: Number
    },

    // Daily Tracking Logs (Start Day / End Day)
    dailyLogs: [{
        date: String, // YYYY-MM-DD
        status: { type: String, enum: ['Pending', 'Started', 'Completed'], default: 'Pending' },
        startTime: Date,
        startLocation: {
            lat: Number,
            lng: Number,
            address: String
        },
        endTime: Date,
        endLocation: {
            lat: Number,
            lng: Number,
            address: String
        },
        tasksDone: String
    }],
    // Enhanced logs for Field Audit
    locations: [{
        lat: Number,
        lng: Number,
        timestamp: { type: Date, default: Date.now },
        dayNumber: Number, // Day 1, Day 2...
        type: { type: String, enum: ['Ping', 'CheckIn', 'AutoArrival', 'StartShift', 'EndShift', 'Activity', 'StartTrip'], default: 'Ping' },
        address: String,
        note: String
    }],
    auditStats: {
        totalDistanceKm: { type: Number, default: 0 },
        timeAtDestinationMins: { type: Number, default: 0 },
        transitTimeMins: { type: Number, default: 0 }
    },
    hrActionBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Trip', tripSchema);
