require("dotenv").config();

// Enforce environment secrets in production/critical environments
if (!process.env.MONGODB_URI) {
  console.error("CRITICAL ERROR: MONGODB_URI is not defined in environment variables!");
  process.exit(1);
}
if (!process.env.SESSION_SECRET) {
  console.error("CRITICAL ERROR: SESSION_SECRET is not defined in environment variables!");
  process.exit(1);
}

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");
const flash = require("connect-flash");
const helmet = require("helmet");
const cors = require("cors");
const Attendance = require("./models/Attendence.js");
const Employee = require("./models/Employee.js");
const documentRoutes = require('./routes/document');
const Announcement = require('./models/Announcement');
const Notification = require('./models/Notification.js');
const Leave = require("./models/Leave.js");
const Regularization = require("./models/Regularization.js");
const { requireAuth, preventCache } = require("./middleware/auth");

// Eagerly load all tenant models to ensure they register their schemas in utils/tenantModel at startup
const fs = require("fs");
const modelsDir = path.join(__dirname, "models");
fs.readdirSync(modelsDir).forEach((file) => {
  const fullPath = path.join(modelsDir, file);
  if (fs.statSync(fullPath).isFile() && file.endsWith(".js")) {
    require(fullPath);
  }
});


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

const rateLimit = require("express-rate-limit");

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    message: "Too many attempts from this IP, please try again after 15 minutes.",
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Security: HTTP headers protection
app.use(helmet({
    contentSecurityPolicy: false // Disable CSP for EJS inline scripts/styles
}));

// Security: CORS configuration for mobile app and API clients
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()) 
    : [];

app.use(cors({
    origin: (origin, callback) => {
        // If no origin (like mobile app, curl, or Postman) or if origin is in the whitelist, allow it
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        // Fallback for development/testing if no whitelist is specified
        if (allowedOrigins.length === 0) {
            return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    exposedHeaders: ['set-cookie']
}));

// Database connection check middleware to handle offline state gracefully
app.use((req, res, next) => {
    const isStaticOrLanding = req.path === '/' ||
        req.path.startsWith('/css') ||
        req.path.startsWith('/js') ||
        req.path.startsWith('/images') ||
        req.path.startsWith('/favicon.ico');

    // Check if Mongoose connection is disconnected (readyState = 0) or disconnecting (readyState = 3)
    const isOffline = mongoose.connection.readyState === 0 || mongoose.connection.readyState === 3;

    if (!isStaticOrLanding && isOffline) {
        const dbErrorMsg = "Could not connect to cloud database, check your internet connection.";

        if (req.headers.accept?.includes('application/json') || req.xhr) {
            return res.status(503).json({ error: dbErrorMsg });
        }

        if (req.path.startsWith('/hr')) {
            return res.render("hr/login", {
                company: req.body?.tenantId || req.query?.company || "",
                error: dbErrorMsg,
                success_msg: "",
                error_msg: ""
            });
        } else if (req.path.includes('/register-company')) {
            return res.render("auth/register", {
                razorpayKeyId: process.env.RAZORPAY_KEY_ID || "",
                error: dbErrorMsg
            });
        } else {
            return res.render("auth/login", {
                company: req.body?.tenantId || req.query?.company || "",
                error: dbErrorMsg,
                success_msg: "",
                error_msg: ""
            });
        }
    }
    next();
});

app.use(
    session({
        secret: process.env.SESSION_SECRET,
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
            secure: process.env.NODE_ENV === 'production', // Auto-enable secure cookies in production
            sameSite: 'lax'
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

// CSRF: Token generation, auto-injection in res.render, and validation middleware
app.use((req, res, next) => {
    // 1. Generate CSRF token if not already in session
    if (req.session) {
        if (!req.session.csrfToken) {
            const crypto = require("crypto");
            req.session.csrfToken = crypto.randomBytes(24).toString("hex");
        }
        res.locals.csrfToken = req.session.csrfToken;
    }

    // 2. Override res.render to auto-inject CSRF token into HTML forms on rendering EJS views
    const originalRender = res.render;
    res.render = function (view, options, callback) {
        const token = req.session?.csrfToken;
        if (token) {
            res.locals.csrfToken = token;
            if (options && typeof options === "object") {
                options.csrfToken = token;
            }
        }

        originalRender.call(this, view, options, (err, html) => {
            if (err) {
                if (callback) return callback(err);
                return next(err);
            }

            // Automatically inject hidden CSRF token input field inside EJS forms using POST method
            if (html && token) {
                html = html.replace(
                    /(<form[^>]*method=["']POST["'][^>]*>)/gi,
                    `$1\n<input type="hidden" name="_csrf" value="${token}">`
                );
            }

            if (callback) {
                callback(null, html);
            } else {
                res.send(html);
            }
        });
    };

    next();
});

// CSRF Validator Middleware
app.use((req, res, next) => {
    if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
        // 1. Check if the request is a JSON API call (e.g. mobile app client)
        const isJson = req.headers.accept?.includes("application/json") ||
                       req.headers["content-type"]?.includes("application/json") ||
                       req.body?.format === "json" ||
                       req.query?.format === "json";

        if (isJson) {
            return next(); // Bypass CSRF check for API requests
        }

        // 2. Otherwise, validate the CSRF token for browser form submissions
        const token = req.body?._csrf || req.query?._csrf || req.headers["x-csrf-token"];
        if (!token || token !== req.session?.csrfToken) {
            console.warn(`[CSRF Blocked] Method: ${req.method}, Path: ${req.path}`);
            return res.status(403).send("Forbidden: Invalid CSRF Token");
        }
    }
    next();
});

app.use(preventCache); // Prevent caching for all routes (or move inside specific routes if public assets need caching)

// Health check endpoint for load balancers (AWS Route53 / ALB)
app.get("/health", (req, res) => {
    const isDbConnected = mongoose.connection.readyState === 1;
    if (!isDbConnected) {
        return res.status(503).json({ status: "DOWN", database: "Disconnected" });
    }
    res.status(200).json({ status: "UP", database: "Connected" });
});

// Resolve Tenant dynamically on every request
const tenantResolver = require("./middleware/tenantResolver");
app.use(tenantResolver);


const port = Number(process.env.PORT) || 3000;
const server = app.listen(port, "0.0.0.0", () => {
    console.log(`Server started at http://localhost:${port}`);
});

server.on("error", (err) => {
    console.error("Server startup error (e.g. port already in use):", err);
    process.exit(1);
});




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
app.use("/auth", authLimiter, require("./routes/auth.js"));
app.use("/auth", authLimiter, require("./routes/saas")); // SaaS registration

// punch in / punch out (Protected)
app.use("/attendance", requireAuth, require("./routes/attendance.js"));

// HR routes have their own internal auth check, but we can add requireAuth too if needed. 
// However, hr.js has `hrAuth` middleware. keeping it as is or chaining? 
// The user said "secure session", hrAuth checks session too. 
// I'll leave /hr as is for now since it has internal checks, but will ensure it uses the new logic.
app.use("/hr", require("./routes/hr"));
app.use("/hr", require("./routes/shift"));
app.use("/hr", require("./routes/checklist"));
app.use("/", require("./routes/performance"));
app.use("/", require("./routes/timesheet"));
app.use("/", require("./routes/analytics"));

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

// Helpdesk Support Tickets (Protected)
app.use('/ticket', requireAuth, require('./routes/ticket.js'));

// Training & LMS Portal (Protected)
app.use('/training', requireAuth, require('./routes/training.js'));
app.use('/hr/training', requireAuth, require('./routes/training.js'));


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

        // Fetch employee goals & active projects for deadlines (restricted by department)
        const Goal = require("./models/Goal");
        const Project = require("./models/Project");
        const goals = await Goal.find({ employeeId }).sort({ targetDate: 1 });
        const projects = await Project.find({
            status: "Active",
            departments: employee.department
        }).sort({ createdAt: -1 });

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
                notifications,
                goals,
                projects
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
            notifications,
            goals,
            projects,
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

app.get("/terms", (req, res) => {
    res.render("terms");
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

//data  to display all the data in the database (HR only, protected)
app.get('/data', requireAuth, async (req, res) => {
    // Security: Only HR can access the data dump
    if (req.session.role !== 'HR') {
        return res.status(403).send('Access denied. HR only.');
    }

    const employees = await Employee.find();
    const attendance = await Attendance.find();
    const announcements = await Announcement.find();
    const notifications = await Notification.find();
    const leaves = await Leave.find();
    const regularizations = await Regularization.find();

    res.render('data', {
        employees,
        attendance,
        announcements,
        notifications,
        leaves,
        regularizations
    });
});


// Global error handler
app.use((err, req, res, next) => {
    console.error("Global error occurred:", err);

    const isConnectionError = err.name === 'MongoNetworkError' ||
        err.name === 'MongooseError' ||
        err.message?.includes('connect') ||
        err.message?.includes('buffering timed out') ||
        err.message?.includes('session store') ||
        err.message?.includes('MongoStore') ||
        err.message?.includes('topology') ||
        mongoose.connection.readyState === 0 ||
        mongoose.connection.readyState === 3;

    if (isConnectionError) {
        const dbErrorMsg = "Could not connect to cloud database, check your internet connection.";

        if (req.headers.accept?.includes('application/json') || req.xhr) {
            return res.status(503).json({ error: dbErrorMsg });
        }

        if (req.path.startsWith('/hr')) {
            return res.render("hr/login", {
                company: req.body?.tenantId || req.query?.company || "",
                error: dbErrorMsg,
                success_msg: "",
                error_msg: ""
            });
        } else if (req.path.includes('/register-company')) {
            return res.render("auth/register", {
                razorpayKeyId: process.env.RAZORPAY_KEY_ID || "",
                error: dbErrorMsg
            });
        } else {
            return res.render("auth/login", {
                company: req.body?.tenantId || req.query?.company || "",
                error: dbErrorMsg,
                success_msg: "",
                error_msg: ""
            });
        }
    }

    // Generic fallback if not connection error
    const isProduction = process.env.NODE_ENV === 'production';
    const clientErrorMsg = isProduction ? "An unexpected error occurred. Please contact support." : (err.message || "Internal Server Error");

    if (req.headers.accept?.includes('application/json') || req.xhr) {
        return res.status(err.status || 500).json({ error: clientErrorMsg });
    }

    res.status(err.status || 500);
    res.send(`
    <html>
      <head>
        <title>Error | HRMS</title>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Plus Jakarta Sans', sans-serif; background: #f7f9fc; color: #222; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
          .error-card { background: white; border: 1px solid #ebebeb; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); padding: 40px; max-width: 500px; text-align: center; }
          h1 { color: #d85140; font-size: 1.8rem; margin-top: 0; }
          p { color: #717171; line-height: 1.6; }
          .btn { display: inline-block; background: #0052cc; color: white; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: bold; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="error-card">
          <h1>An error occurred</h1>
          <p>${clientErrorMsg}</p>
          <a href="/auth/login" class="btn">Go to Login</a>
        </div>
      </body>
    </html>
  `);
});

module.exports = app;

// Graceful shutdown handler
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    mongoose.connection.close().then(() => {
        console.log('MongoDB connection closed.');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received. Shutting down gracefully...');
    mongoose.connection.close().then(() => {
        console.log('MongoDB connection closed.');
        process.exit(0);
    });
});
