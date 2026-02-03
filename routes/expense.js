const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Expense = require('../models/Expense');
const Employee = require('../models/Employee');

// --- MULTER SETUP (File Uploads) ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Ensure this directory exists or create it. 
        // For simple apps, we assume 'public/uploads' exists.
        // We will serve these statically.
        cb(null, 'public/uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|pdf/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only images and PDFs are allowed!'));
    }
});

// --- MIDDLEWARE ---
function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.redirect('/auth/login');
    }
    next();
}

// --- ROUTES ---

// 1. View Expenses (Employee)
router.get('/my-expenses', requireAuth, async (req, res) => {
    try {
        const employeeId = req.session.employeeId;
        const expenses = await Expense.find({ employeeId }).sort({ createdAt: -1 });
        const employee = await Employee.findById(employeeId); // For layout
        res.render('expense/my-expenses', { expenses, employee });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

// 2. Apply Expense Page
router.get('/apply', requireAuth, async (req, res) => {
    try {
        const employee = await Employee.findById(req.session.employeeId);
        res.render('expense/apply', { employee });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

// 3. Submit Expense (POST)
router.post('/apply', requireAuth, upload.single('receipt'), async (req, res) => {
    try {
        const { type, amount, date, description, lat, lng } = req.body;

        const expense = new Expense({
            employeeId: req.session.employeeId,
            type,
            amount,
            date,
            description,
            receiptPath: req.file ? '/uploads/' + req.file.filename : null,
            location: {
                lat: lat ? parseFloat(lat) : null,
                lng: lng ? parseFloat(lng) : null
            }
        });

        await expense.save();

        // Also update Last Known Location if coords provided
        if (lat && lng) {
            await Employee.findByIdAndUpdate(req.session.employeeId, {
                lastKnownLocation: {
                    lat: parseFloat(lat),
                    lng: parseFloat(lng),
                    timestamp: new Date()
                }
            });
        }

        res.redirect('/expense/my-expenses');
    } catch (err) {
        console.error("Expense Error:", err);
        res.status(500).send("Error submitting expense: " + err.message);
    }
});

// 4. Check-In (Location Update Only)
router.post('/check-in', requireAuth, async (req, res) => {
    try {
        const { lat, lng, address } = req.body;

        if (!lat || !lng) {
            return res.status(400).json({ success: false, message: 'Coordinates missing' });
        }

        await Employee.findByIdAndUpdate(req.session.employeeId, {
            lastKnownLocation: {
                lat: parseFloat(lat),
                lng: parseFloat(lng),
                address: address || null,
                timestamp: new Date()
            }
        });

        res.json({ success: true, message: 'Location updated successfully' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// --- HR ROUTES ---

// 5. HR Expense Dashboard & Map
router.get('/hr/dashboard', requireAuth, async (req, res) => {
    // Check if HR
    if (req.session.role !== 'HR') return res.redirect('/dashboard');

    try {
        const pendingExpenses = await Expense.find({ status: 'Pending' })
            .populate('employeeId')
            .sort({ date: 1 });

        // Get all employees with recent location data (active status only ideally)
        const employeesOnMap = await Employee.find({
            status: 'Active',
            'lastKnownLocation.lat': { $ne: null }
        }).select('firstName lastName department designation lastKnownLocation');

        res.render('hr/expense-map', { pendingExpenses, employeesOnMap });

    } catch (err) {
        console.error(err);
        res.status(500).send("HR Expense Error");
    }
});

// 6. HR Approve/Reject
router.post('/hr/action/:id', requireAuth, async (req, res) => {
    if (req.session.role !== 'HR') return res.redirect('/dashboard');

    try {
        const { status, reason } = req.body;
        const expense = await Expense.findById(req.params.id);

        if (!expense) return res.status(404).send("Expense not found");

        expense.status = status; // Approved or Rejected
        if (status === 'Rejected') {
            expense.rejectionReason = reason;
        }
        expense.hrActionBy = req.session.employeeId;

        await expense.save();

        res.redirect('/expense/hr/dashboard');

    } catch (err) {
        console.error(err);
        res.status(500).send("Action Error");
    }
});

module.exports = router;
