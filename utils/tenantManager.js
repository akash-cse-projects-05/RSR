const mongoose = require("mongoose");
const Tenant = require("../models/master/Tenant");

const tenantConnections = {};

async function getTenantConnection(tenantId) {
  const cleanTenantId = tenantId ? tenantId.toLowerCase().trim() : "";
  if (tenantConnections[cleanTenantId]) {
    return tenantConnections[cleanTenantId];
  }

  const tenant = await Tenant.findOne({ tenantId: cleanTenantId, status: "active" });
  if (!tenant) {
    throw new Error(`Company ID '${tenantId}' not found or inactive`);
  }

  // Enforce SaaS Subscription Expiry Check
  if (tenant.subscriptionExpiry && new Date() > tenant.subscriptionExpiry) {
    throw new Error(`Subscription for Company ID '${tenantId}' has expired. Please contact your administrator to renew.`);
  }


  const baseURI = process.env.MONGODB_URI.split('?')[0];
  const queryParams = process.env.MONGODB_URI.split('?')[1] || '';
  const tenantDbName = (cleanTenantId === 'rsr') ? 'RSR' : cleanTenantId;
  
  const baseParts = baseURI.split('/');
  if (baseParts[baseParts.length - 1] === '') {
    baseParts.pop();
  }
  baseParts[baseParts.length - 1] = tenantDbName;
  const tenantURI = baseParts.join('/') + (queryParams ? `?${queryParams}` : '');

  console.log(`Connecting dynamically to Tenant DB [${cleanTenantId}]: ${tenantURI.replace(/:([^@:]+)@/, ':****@')}`);
  const connection = mongoose.createConnection(tenantURI);
  
  tenantConnections[cleanTenantId] = connection;
  return connection;
}

module.exports = { getTenantConnection };
