const mongoose = require('mongoose');
const createTenantModelProxy = require("../utils/tenantModel");

const notificationSchema = new mongoose.Schema({
  title: String,
  message: String,
  date: { type: Date, default: Date.now }
});

module.exports = createTenantModelProxy('Notification', notificationSchema);