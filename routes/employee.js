const express = require("express");
const router = express.Router();
const Employee = require("../models/Employee");
const User = require("../models/User");
const Document = require("../models/Documents");

// SHOW ADD EMPLOYEE PAGE (NEW)
router.get("/add", (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json');
  if (isJson) {
    return res.json({ success: true });
  }
  res.render("employee/add.ejs");
});

// HR add employee (FORM SUBMIT)
router.post("/add", async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json') || req.body.format === 'json';
  try {
    const employee = await Employee.create(req.body);

    await User.create({
      employeeId: employee._id,
      username: employee.employeeCode,
      password: "temp123"
    });

    if (isJson) {
      return res.json({ success: true, employee });
    }
    res.redirect('/hr/dashboard');
  } catch (err) {
    console.error(err);
    if (isJson) return res.status(500).json({ error: "Failed to create employee: " + err.message });
    res.status(500).send("Failed to create employee");
  }
});


// Profile page route
// filepath: d:\RSR_AVIATION\routes\employee.js
// router.get('/profile', async (req, res) => {
//   const user = await User.findById(req.session.userId);
//   res.render('employee/profile', { user });
// });

router.get('/profile', async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json');
  try {
    // Fetch user
    const user = await User.findById(req.session.userId)
      .populate('employeeId'); // Populates employee details

    if (!user) {
      if (isJson) return res.status(404).json({ error: "User profile not found" });
      return res.status(404).send("User profile not found");
    }

    // Fetch documents related to this user
    const documents = await Document.find({ user: req.session.userId });

    // Fetch LOP leaves for this employee
    const Leave = require('../models/Leave');
    const lopLeaves = await Leave.find({
      employeeId: user.employeeId._id,
      leaveType: 'LOP',
      status: 'APPROVED'
    }).sort({ appliedAt: -1 });

    if (isJson) {
      return res.json({
        user,
        employee: user.employeeId,
        documents,
        lopLeaves
      });
    }

    res.render('employee/profile', {
      user,
      employee: user.employeeId, // Populated employee details
      documents,
      lopLeaves
    });
  } catch (err) {
    console.error(err);
    if (isJson) return res.status(500).json({ error: 'Error loading profile' });
    res.status(500).send('Error loading profile');
  }
});



router.get('/photo/:id', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee || !employee.profilePhoto || !employee.profilePhoto.data) {
      return res.status(404).send('No photo found');
    }
    res.set('Content-Type', employee.profilePhoto.contentType);
    res.send(employee.profilePhoto.data);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching photo');
  }
});

router.get("/edit/:id", async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json');
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      if (isJson) return res.status(404).json({ error: "Employee not found" });
      return res.redirect('/hr/users?error=not_found');
    }
    if (isJson) {
      return res.json({ employee });
    }
    res.render("employee/edit", { employee });
  } catch (err) {
    console.error(err);
    if (isJson) return res.status(500).json({ error: "Load failed" });
    res.redirect('/hr/users?error=load_failed');
  }
});

router.post("/edit/:id", async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json') || req.body.format === 'json';
  try {
    const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (isJson) {
      return res.json({ success: true, employee });
    }
    res.redirect('/hr/users');
  } catch (err) {
    console.error(err);
    if (isJson) return res.status(500).json({ error: "Update failed" });
    res.redirect('/hr/users?error=update_failed');
  }
});

const Announcement = require('../models/Announcement');
const nodemailer = require('nodemailer');

// Handle Resignation Application
router.post('/resign', async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json') || req.body.format === 'json';
  try {
    const employee = await Employee.findById(req.session.employeeId);
    if (!employee) {
      if (isJson) return res.status(404).json({ error: 'Employee not found' });
      return res.status(404).send('Employee not found');
    }

    employee.resignationStatus = 'Pending';
    employee.resignationDate = new Date();
    employee.resignationReason = req.body.reason || 'No reason provided';
    await employee.save();

    // Notify Manager via Department Announcement (Scoped)
    await Announcement.create({
      title: `Resignation: ${employee.firstName} ${employee.lastName}`,
      message: `${employee.firstName} ${employee.lastName} (${employee.designation}) has submitted their resignation.\nReason: ${employee.resignationReason}`,
      department: employee.department
    });

    // Find Manager for Email
    const manager = await Employee.findOne({ department: employee.department, designation: 'MANAGER' });
    if (manager && manager.email) {
      const transporter = nodemailer.createTransport({
        service: process.env.SMTP_SERVICE || "Gmail",
        auth: {
          user: process.env.SMTP_EMAIL,
          pass: process.env.SMTP_PASSWORD
        }
      });

      await transporter.sendMail({
        to: manager.email,
        from: process.env.SMTP_EMAIL,
        subject: `Resignation Request - ${employee.firstName} ${employee.lastName}`,
        html: `<p>Dear ${manager.firstName},</p>
                 <p>${employee.firstName} ${employee.lastName} has applied for resignation on ${new Date().toLocaleDateString()}.</p>
                 <p><strong>Reason:</strong> ${employee.resignationReason}</p>
                 <p>Please log in to the HRMS to review pending actions if any.</p>`
      });
    }

    if (isJson) {
      return res.json({ success: true, message: "Resignation submitted successfully", employee });
    }
    res.redirect('/employee/profile');
  } catch (err) {
    console.error(err);
    if (isJson) return res.status(500).json({ error: 'Error processing resignation' });
    res.status(500).send('Error processing resignation');
  }
});

// Handle Resignation Revocation
router.post('/revoke-resignation', async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json') || req.body.format === 'json';
  try {
    const employee = await Employee.findById(req.session.employeeId);
    if (!employee) {
      if (isJson) return res.status(404).json({ error: 'Employee not found' });
      return res.status(404).send('Employee not found');
    }

    if (employee.resignationStatus === 'Pending') {
      employee.resignationStatus = 'Revoked'; // Or null if you prefer simply clearing it. Storing 'Revoked' keeps history.
      await employee.save();

      // Notify Manager of Revocation
      await Announcement.create({
        title: `Resignation Revoked: ${employee.firstName} ${employee.lastName}`,
        message: `${employee.firstName} ${employee.lastName} has revoked their resignation request.`,
        department: employee.department
      });
    }

    if (isJson) {
      return res.json({ success: true, message: "Resignation revoked successfully", employee });
    }
    res.redirect('/employee/profile');
  } catch (err) {
    console.error(err);
    if (isJson) return res.status(500).json({ error: 'Error revoking resignation' });
    res.status(500).send('Error revoking resignation');
  }
});

module.exports = router;
