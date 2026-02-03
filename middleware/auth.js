// middleware/auth.js

const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect("/auth/login");
    }
    next();
};

const preventCache = (req, res, next) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.set("Surrogate-Control", "no-store");
    next();
};

module.exports = { requireAuth, preventCache };
