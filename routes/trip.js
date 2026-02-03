const express = require('express');
const router = express.Router();
const Trip = require('../models/Trip');
const Employee = require('../models/Employee');

// Middleware
function requireAuth(req, res, next) {
    if (!req.session.userId) return res.redirect('/auth/login');
    next();
}

// 1. Request Trip (Page)
router.get('/request', requireAuth, async (req, res) => {
    const employee = await Employee.findById(req.session.employeeId);
    res.render('trip/request', { employee });
});

// 2. Submit Trip Request
router.post('/request', requireAuth, async (req, res) => {
    try {
        const { source, destination, purpose, startDate, endDate, destLat, destLng } = req.body;

        const newTrip = {
            employeeId: req.session.employeeId,
            source,
            destination,
            purpose,
            startDate,
            endDate
        };

        if (destLat && destLng) {
            newTrip.destinationCoordinates = {
                lat: parseFloat(destLat),
                lng: parseFloat(destLng)
            };
        }

        await Trip.create(newTrip);
        res.redirect('/trip/my-trips');
    } catch (err) {
        console.error(err);
        res.status(500).send("Error creating trip");
    }
});

// 3. My Trips List
router.get('/my-trips', requireAuth, async (req, res) => {
    try {
        const trips = await Trip.find({ employeeId: req.session.employeeId }).sort({ createdAt: -1 });
        const employee = await Employee.findById(req.session.employeeId);
        res.render('trip/my-trips', { trips, employee });
    } catch (err) {
        res.status(500).send("Server Error");
    }
});

// 4. Start Trip
router.post('/start/:id', requireAuth, async (req, res) => {
    try {
        const { lat, lng } = req.body;
        const trip = await Trip.findOne({ _id: req.params.id, employeeId: req.session.employeeId });

        if (trip && trip.status === 'Approved') {
            trip.status = 'In Progress';
            const todayDate = new Date().toISOString().slice(0, 10);

            // 1. Log Initial Location
            if (lat && lng) {
                trip.locations.push({
                    lat, lng,
                    timestamp: new Date(),
                    dayNumber: 1,
                    type: 'StartTrip'
                });
            }

            // 2. Auto-Start Daily Log (Punch In)
            // Check if log exists (unlikely for new trip but safe)
            let log = trip.dailyLogs.find(l => l.date === todayDate);
            if (!log) {
                trip.dailyLogs.push({
                    date: todayDate,
                    status: 'Started',
                    startTime: new Date(),
                    startLocation: { lat, lng, address: 'Trip Start Point' }
                });
            } else {
                log.status = 'Started';
                log.startTime = new Date();
                log.startLocation = { lat, lng, address: 'Trip Start Point' };
            }

            await trip.save();
            res.json({ success: true, redirect: '/trip/my-trips' });
        } else {
            res.status(400).json({ error: 'Trip not approved or already started' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error starting trip" });
    }
});

// 5. End Trip
router.post('/end/:id', requireAuth, async (req, res) => {
    try {
        const trip = await Trip.findOne({ _id: req.params.id, employeeId: req.session.employeeId }); // Fixed: Use findOne with employeeId for security
        if (trip && trip.status === 'In Progress') {

            // Auto-End any open daily log
            const todayDate = new Date().toISOString().slice(0, 10);
            let log = trip.dailyLogs.find(l => l.status === 'Started'); // Find ANY started log, prioritise today?? No, just close open one.

            if (log) {
                log.status = 'Completed';
                log.endTime = new Date();
                log.tasksDone = log.tasksDone || "Trip Ended by User";
            }

            trip.status = 'Completed';
            await trip.save();
        }
        res.redirect('/trip/my-trips');
    } catch (err) {
        console.error(err);
        res.status(500).send("Error ending trip");
    }
});

// --- HR ROUTES ---

// 4. HR Dashboard (List Trips)
router.get('/hr/dashboard', requireAuth, async (req, res) => {
    if (req.session.role !== 'HR') return res.redirect('/dashboard');
    try {
        // Pending Trips
        const pendingTrips = await Trip.find({ status: 'Pending' }).populate('employeeId');

        // Active Trips (Approved and today is within range)
        const today = new Date();
        const activeTrips = await Trip.find({
            status: 'Approved',
            startDate: { $lte: today },
            endDate: { $gte: today }
        }).populate('employeeId');

        // Completed Trips (Recently finished for Review)
        const completedTrips = await Trip.find({ status: 'Completed' })
            .sort({ updatedAt: -1 })
            .limit(20)
            .populate('employeeId');

        res.render('hr/trip-dashboard', { pendingTrips, activeTrips, completedTrips });
    } catch (err) {
        console.error(err);
        res.status(500).send("HR Error");
    }
});

// 5. HR Action (Approve/Reject)
router.post('/hr/action/:id', requireAuth, async (req, res) => {
    if (req.session.role !== 'HR') return res.redirect('/dashboard');
    try {
        const { status, reason } = req.body;
        const trip = await Trip.findById(req.params.id);
        if (!trip) return res.status(404).send("Trip not found");

        trip.status = status;
        if (reason) trip.rejectionReason = reason;
        trip.hrActionBy = req.session.employeeId;

        await trip.save();
        res.redirect('/trip/hr/dashboard');
    } catch (err) {
        res.status(500).send("Action Error");
    }
});

// 6. View Route Map (HR & Manager)
router.get('/track/:id', requireAuth, async (req, res) => {
    try {
        const trip = await Trip.findById(req.params.id).populate('employeeId');
        if (!trip) return res.status(404).send("Trip not found");

        const viewer = await Employee.findById(req.session.employeeId);

        // Access Control: HR, Manager of same Dept, or OWNER
        const isHR = req.session.role === 'HR';
        const isManager = req.session.role === 'MANAGER' && viewer.department === trip.employeeId.department;
        const isOwner = trip.employeeId._id.toString() === req.session.employeeId;

        if (!isHR && !isManager && !isOwner) {
            return res.status(403).send("Access Denied");
        }

        res.render('hr/trip-map', { trip, isOwner });
    } catch (err) {
        console.error(err);
        res.status(500).send("Map Error");
    }
});

// 12. Update Daily Log (Description)
router.post('/update-log/:tripId', requireAuth, async (req, res) => {
    try {
        const { logId, tasksDone } = req.body;
        const trip = await Trip.findOne({ _id: req.params.tripId, employeeId: req.session.employeeId });

        if (!trip) return res.status(404).json({ error: "Trip not found" });

        const log = trip.dailyLogs.id(logId);
        if (!log) return res.status(404).json({ error: "Log entry not found" });

        log.tasksDone = tasksDone;
        await trip.save();

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server Error" });
    }
});

// 7. Field Audit Monitor (Employee View)
router.get('/monitor/:id', requireAuth, async (req, res) => {
    try {
        const trip = await Trip.findOne({ _id: req.params.id, employeeId: req.session.employeeId });
        if (!trip) return res.redirect('/trip/my-trips');

        // Calculate abstract "Day Number"
        const start = new Date(trip.startDate);
        const today = new Date();
        const dayNumber = Math.ceil((today - start) / (1000 * 60 * 60 * 24)) || 1;

        res.render('trip/monitor', { trip, dayNumber });
    } catch (err) { res.status(500).send("Error loading monitor"); }
});

// 8. Log Field Data
router.post('/log/:id', requireAuth, async (req, res) => {
    try {
        const { type, lat, lng } = req.body;
        const trip = await Trip.findOne({ _id: req.params.id, employeeId: req.session.employeeId });
        if (!trip) return res.status(404).json({ error: "Trip not found" });

        const start = new Date(trip.startDate);
        const today = new Date();
        const dayNumber = Math.ceil((today - start) / (1000 * 60 * 60 * 24)) || 1;

        if (lat && lng) {
            trip.locations.push({
                lat, lng,
                timestamp: new Date(),
                dayNumber: dayNumber,
                type: type || 'Ping'
            });
            await trip.save();
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Server Error" }); }
});

// 8b. Log Specific Activity (Note)
router.post('/log-activity/:id', requireAuth, async (req, res) => {
    try {
        const { lat, lng, note, address } = req.body;
        const trip = await Trip.findOne({ _id: req.params.id, employeeId: req.session.employeeId });
        if (!trip) return res.status(404).json({ error: "Trip not found" });

        const start = new Date(trip.startDate);
        const today = new Date();
        const dayNumber = Math.ceil((today - start) / (1000 * 60 * 60 * 24)) || 1;

        trip.locations.push({
            lat, lng,
            timestamp: new Date(),
            dayNumber: dayNumber,
            type: 'Activity',
            address: address || '',
            note: note
        });

        await trip.save();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server Error" });
    }
});

// 9. Start Day (Trip Daily Session)
router.post('/start-day/:id', requireAuth, async (req, res) => {
    try {
        const { lat, lng, address } = req.body;
        const trip = await Trip.findOne({ _id: req.params.id, employeeId: req.session.employeeId });

        if (!trip) return res.status(404).json({ error: "Trip not found" });

        const todayDate = new Date().toISOString().slice(0, 10);

        // Check if log exists for today
        let log = trip.dailyLogs.find(l => l.date === todayDate);

        if (log) {
            if (log.status !== 'Pending') {
                return res.status(400).json({ error: "Day already started or completed" });
            }
            // Update existing
            log.status = 'Started';
            log.startTime = new Date();
            log.startLocation = { lat, lng, address };
        } else {
            // Create new
            trip.dailyLogs.push({
                date: todayDate,
                status: 'Started',
                startTime: new Date(),
                startLocation: { lat, lng, address }
            });
        }

        await trip.save();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server Error" });
    }
});

// 10. End Day (Trip Daily Session)
router.post('/end-day/:id', requireAuth, async (req, res) => {
    try {
        const { lat, lng, address, tasksDone } = req.body;
        const trip = await Trip.findOne({ _id: req.params.id, employeeId: req.session.employeeId });

        if (!trip) return res.status(404).json({ error: "Trip not found" });

        const todayDate = new Date().toISOString().slice(0, 10);
        let log = trip.dailyLogs.find(l => l.date === todayDate);

        if (!log || log.status !== 'Started') {
            return res.status(400).json({ error: "Day not started today" });
        }

        log.status = 'Completed';
        log.endTime = new Date();
        log.endLocation = { lat, lng, address };
        log.tasksDone = tasksDone; // Save user description

        await trip.save();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server Error" });
    }
});

module.exports = router;
