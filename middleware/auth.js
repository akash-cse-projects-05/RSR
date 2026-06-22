const Employee = require("../models/Employee");

const requireAuth = async (req, res, next) => {
    const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json');

    if (!req.session.userId) {
        if (isJson) {
            return res.status(401).json({ error: "Unauthorized session. Please login." });
        }
        return res.redirect("/auth/login");
    }

    // Bypass for hardcoded system HR administrator which does not have an Employee record
    if (req.session.role === "HR" && req.session.employeeId === "000000000000000000000000") {
        return next();
    }

    // Check if the employee account is still active
    try {
        const employee = await Employee.findById(req.session.employeeId);
        if (!employee || employee.status !== "Active") {
            req.session.destroy();
            if (isJson) {
                return res.status(403).json({ error: "Your account has been deactivated. Please contact HR." });
            }
            return res.render("auth/login", { error: "Your account has been deactivated. Please contact HR." });
        }
        next();
    } catch (err) {
        console.error("Auth Middleware Error:", err);
        if (isJson) {
            return res.status(500).json({ error: "Server authentication error." });
        }
        res.redirect("/auth/login");
    }
};

const preventCache = (req, res, next) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.set("Surrogate-Control", "no-store");
    next();
};

module.exports = { requireAuth, preventCache };
