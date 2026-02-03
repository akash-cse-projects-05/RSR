const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const Trip = require('../models/Trip');

// Middleware
function requireAuth(req, res, next) {
    if (!req.session.userId) return res.redirect('/auth/login');
    next();
}

// 1. Employee: Update Location Page
router.get('/update', requireAuth, async (req, res) => {
    try {
        const employee = await Employee.findById(req.session.employeeId);
        res.render('tracking/update', { employee });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

// 2. Employee: Submit Location Update
router.post('/update', requireAuth, async (req, res) => {
    try {
        const { lat, lng, address, status, notes } = req.body;

        if (!lat || !lng) {
            return res.status(400).json({ success: false, message: "Coordinates required" });
        }

        const timestamp = new Date();

        // Update Employee Record
        await Employee.findByIdAndUpdate(req.session.employeeId, {
            lastKnownLocation: {
                lat: parseFloat(lat),
                lng: parseFloat(lng),
                address: address || "Manual Pin Drop",
                timestamp: timestamp
            },
            currentStatus: status || "Active"
        });

        // Optional: If they are on an active trip, log it there too (Code Reuse from Expense)
        // We can keep this "Smart" integration silently in the background
        const today = new Date();
        const activeTrip = await Trip.findOne({
            employeeId: req.session.employeeId,
            status: 'Approved',
            startDate: { $lte: today },
            endDate: { $gte: today }
        });

        if (activeTrip) {
            activeTrip.locations.push({
                lat: parseFloat(lat),
                lng: parseFloat(lng),
                address: address || "Manual Update",
                timestamp: timestamp
            });
            await activeTrip.save();
        }

        res.json({ success: true, message: "Location Updated" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// 3. HR: Live Tracking Dashboard
router.get('/hr', requireAuth, async (req, res) => {
    if (req.session.role !== 'HR') return res.redirect('/dashboard');

    try {
        // Find all employees who have a location set
        const trackedEmployees = await Employee.find({
            'lastKnownLocation.lat': { $ne: null }
        }).select('firstName lastName department designation lastKnownLocation currentStatus');

        res.render('tracking/hr-dashboard', { trackedEmployees });
    } catch (err) {
        console.error(err);
        res.status(500).send("Tracking Error");
    }
});

module.exports = router;
