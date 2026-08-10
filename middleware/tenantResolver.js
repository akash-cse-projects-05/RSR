const mongoose = require("mongoose");
const tenantLocalStorage = require("../utils/tenantStore");
const { getTenantConnection } = require("../utils/tenantManager");

module.exports = async (req, res, next) => {
  console.log(`[TenantResolver] Path: ${req.path}, OriginalUrl: ${req.originalUrl}`);

  // Bypass tenant resolution for registration page
  if (req.path === '/auth/register-company' || req.originalUrl === '/auth/register-company') {
    console.log(`[TenantResolver] Bypassing tenant resolution for registration page.`);
    return tenantLocalStorage.run({ connection: mongoose.connection, tenantId: "default" }, next);
  }

  // Resolve tenant ID from session, body, query, or custom header
  let tenantId = (req.session && req.session.tenantId) ||
                 (req.body && req.body.tenantId) ||
                 (req.query && req.query.tenantId) ||
                 (req.headers && req.headers["x-tenant-id"]);

  if (tenantId) {
    tenantId = tenantId.toLowerCase().trim();
  }

  console.log(`[TenantResolver] Resolved tenantId: ${tenantId}`);

  if (!tenantId || tenantId === "default") {
    // Fall back to default global Mongoose connection (e.g. for registration and initial landing)
    return tenantLocalStorage.run({ connection: mongoose.connection, tenantId: "default" }, next);
  }

  try {
    const connection = await getTenantConnection(tenantId);
    
    // Propagate the connection and tenantId inside this asynchronous execution path
    tenantLocalStorage.run({ connection, tenantId }, next);
  } catch (err) {
    console.error(`[Tenant Resolution Error] Failed for tenant '${tenantId}':`, err.message);
    
    const isConnectionError = err.name === 'MongoNetworkError' || 
                              err.name === 'MongooseError' ||
                              err.message.includes('connect') || 
                              err.message.includes('buffering timed out') ||
                              mongoose.connection.readyState === 0 ||
                              mongoose.connection.readyState === 3;

    const friendlyMessage = isConnectionError 
      ? "Could not connect to cloud database, check your internet connection."
      : err.message;

    const isJson = req.query && req.query.format === 'json' || req.headers && req.headers.accept?.includes('application/json');
    if (isJson) {
      return res.status(isConnectionError ? 503 : 404).json({ error: friendlyMessage });
    }
    
    const errorParam = encodeURIComponent(friendlyMessage);
    if (req.session) {
      req.session.destroy(() => {
        res.redirect(`/auth/login?error=${errorParam}&company=${tenantId}`);
      });
    } else {
      res.redirect(`/auth/login?error=${errorParam}&company=${tenantId}`);
    }
  }

};
