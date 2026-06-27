require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");
const flash = require("connect-flash");
const Attendance = require("./models/Attendence.js");
const Employee = require("./models/Employee.js");
const documentRoutes = require('./routes/document');
const Announcement = require('./models/Announcement');
const Notification = require('./models/Notification.js');
const Leave = require("./models/Leave.js");
const Regularization = require("./models/Regularization.js");
const { requireAuth, preventCache } = require("./middleware/auth");


const app = express();
const dbURI = process.env.MONGODB_URI;

/* ======================
   MONGODB CONNECTION
   (Same DB used by Compass)
====================== */

mongoose
  .connect(dbURI)
  .then(() => console.log("MongoDB connected (Compass DB)"))
  .catch(err => console.error(" MongoDB error:", err));

/* ======================
   MIDDLEWARE
====================== */

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "rsr_hrms_secret",
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({
      mongoUrl: process.env.MONGODB_URI,
      ttl: 24 * 60 * 60, // Sessions expire in 24 hours
      autoRemove: 'native'
    }),
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
      httpOnly: true,
      secure: false // set to true if using HTTPS
    }
  })
);

app.use(flash());

// Global variables for flash messages
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error'); // For passport errors if any
  next();
});

app.use(preventCache); // Prevent caching for all routes (or move inside specific routes if public assets need caching)

// Resolve Tenant dynamically on every request
const tenantResolver = require("./middleware/tenantResolver");
app.use(tenantResolver);









const requestedPort = Number(process.env.PORT) || 3000;
const fallbackPorts = [requestedPort, 3000, 3001, 5000];

const startServer = (port, index = 0) => {
  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`Server started at http://localhost:${port}`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE" && index < fallbackPorts.length - 1) {
      const nextPort = fallbackPorts[index + 1];
      console.error(`Port ${port} is already in use. Trying ${nextPort}...`);
      startServer(nextPort, index + 1);
      return;
    }

    console.error("Server startup error:", err);
    process.exit(1);
  });
};

startServer(requestedPort);




/* ======================
   VIEW ENGINE
====================== */

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

/* ======================
   STATIC FILES
====================== */

app.use(express.static(path.join(__dirname, "public")));

/* ======================
   ROUTES
====================== */

// HR adds employees (Protected)
app.use("/employee", requireAuth, require("./routes/employee.js"));

//doucument updation for the employees (Protected)
app.use('/documents', requireAuth, documentRoutes);

// Payslip routes (Protected)
app.use('/payslip', requireAuth, require('./routes/payslip.js'));

// employee login - NO AUTH REQUIRED
app.use("/auth", require("./routes/auth.js"));
app.use("/auth", require("./routes/saas")); // SaaS registration

// punch in / punch out (Protected)
app.use("/attendance", requireAuth, require("./routes/attendance.js"));

// HR routes have their own internal auth check, but we can add requireAuth too if needed. 
// However, hr.js has `hrAuth` middleware. keeping it as is or chaining? 
// The user said "secure session", hrAuth checks session too. 
// I'll leave /hr as is for now since it has internal checks, but will ensure it uses the new logic.
app.use("/hr", require("./routes/hr"));

//leave approval collection (Protected)
app.use("/leave", requireAuth, require("./routes/leave"));

//attendance regularization (Protected)
app.use("/regularization", requireAuth, require("./routes/regularization.js"));

//notifications and announcements (Protected)
app.use('/notice-board', requireAuth, require('./routes/noticeBoard'));

// Department dashboard, tasks, and leave approval (Protected)
app.use('/department', requireAuth, require('./routes/department.js'));

// Expense & Map Tracking (Protected)
app.use('/expense', requireAuth, require('./routes/expense.js'));

// Trip Management (Protected)
app.use('/trip', requireAuth, require('./routes/trip.js'));


app.get("/", (req, res) => {
  res.render("landing");
})

/* ======================
   DASHBOARD
====================== */

// app.get("/dashboard", async (req, res) => {
//   if (!req.session.userId) {
//     return res.redirect("/auth/login");
//   }

//   const today = new Date().toISOString().slice(0, 10);

//   const attendance = await Attendance.findOne({
//     employeeId: req.session.employeeId,
//     date: today
//   });

//   const employee = await Employee.findById(req.session.employeeId);

//   res.render("dashboard", {
//     attendance: attendance || null,
//     employee
//   });
// });
// Dashboard (Protected)
app.get("/dashboard", requireAuth, async (req, res) => {
  if (req.session.role === "HR") {
    return res.redirect("/hr/dashboard");
  }

  try {
    if (!req.session.userId) {
      return res.redirect("/auth/login");
    }

    const employeeId = req.session.employeeId;

    /* =========================
       TODAY ATTENDANCE
    ========================= */
    const today = new Date().toISOString().slice(0, 10);

    const attendance = await Attendance.findOne({
      employeeId,
      date: today
    });
    /*---------------------
       ANNOUNCEMENTS & NOTIFICATIONS
       -------------------*/
    const announcements = await Announcement.find().sort({ date: -1 });
    const notifications = await Notification.find().sort({ date: -1 });

    /* =========================
       EMPLOYEE DETAILS
    ========================= */
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      req.session.destroy();
      return res.redirect("/auth/login");
    }
    const employees = await Employee.find();

    /* =========================
       MONTHLY PERFORMANCE LOGIC
    ========================= */
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Count working days in the month (Mon-Fri)
    let workingDays = 0;
    let d = new Date(startOfMonth);

    while (d <= endOfMonth) {
      const day = d.getDay(); // 0=Sun, 6=Sat
      if (day !== 0 && day !== 6) {
        workingDays++;
      }
      d.setDate(d.getDate() + 1);
    }

    // Fetch this month's attendance records
    const monthlyAttendance = await Attendance.find({
      employeeId,
      date: {
        $gte: startOfMonth.toISOString().slice(0, 10),
        $lte: endOfMonth.toISOString().slice(0, 10)
      }
    });

    const daysPresent = monthlyAttendance.length;

    // Fetch Approved Leaves for this month
    // Simple logic: Leaves starting in this month
    const currentMonthStr = startOfMonth.toISOString().slice(0, 7); // "YYYY-MM"

    // We need to fetch all approved leaves that overlap with this month ideally, 
    // but for now, let's fetch leaves starting this month.
    // Since dates are strings YYYY-MM-DD
    const approvedLeaves = await Leave.find({
      employeeId,
      status: 'APPROVED',
      fromDate: { $regex: new RegExp(`^${currentMonthStr}`) }
    });

    const leavesTaken = approvedLeaves.reduce((acc, leave) => acc + (leave.totalDays || 0), 0);

    const attendancePercentage = workingDays > 0 ? Math.round((daysPresent / workingDays) * 100) : 0;

    /* =========================
       SEND DATA TO DASHBOARD
    ========================= */
    if (req.query.format === 'json' || req.headers.accept?.includes('application/json')) {
      return res.json({
        attendance: attendance || null,
        employee,
        employees,
        workingDays,
        daysPresent,
        leavesTaken,
        attendancePercentage,
        announcements,
        notifications
      });
    }

    res.render("dashboard", {
      attendance: attendance || null,
      employee,
      employees,

      // Stats
      workingDays,
      daysPresent,
      leavesTaken,
      attendancePercentage,

      announcements,
      announcements,
      notifications,
      passwordUpdated: req.query.passwordUpdated === "true"
    });

  } catch (error) {
    console.error("Dashboard Error:", error);
    if (req.headers.accept?.includes('application/json')) {
      return res.status(500).json({ error: "Failed to load dashboard data" });
    }
    res.render("auth/login", { error: "Failed to load dashboard data. Please try again." });
  }
});

/* ======================
   DEFAULT ROUTE
====================== */

app.get("/auth", (req, res) => {
  res.redirect("/auth/login");
});



/* ======================
   LOGOUT
====================== */

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error("Session destroy error:", err);
    res.clearCookie("connect.sid"); // Clear session cookie
    res.redirect("/auth/login");
  });
});

//data  to display all the dat threr in the databse
app.get('/data', async (req, res) => {
  const employees = await Employee.find();
  const attendance = await Attendance.find();
  const announcements = await Announcement.find();
  const notifications = await Notification.find();
  const leaves = await Leave.find();
  const regularizations = await Regularization.find();
  // Add more collections as needed

  res.render('data', {
    employees,
    attendance,
    announcements,
    notifications,
    leaves,
    regularizations
    // Add more as needed
  });
});


module.exports = app;










