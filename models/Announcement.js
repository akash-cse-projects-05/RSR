const mongoose = require('mongoose');
const createTenantModelProxy = require("../utils/tenantModel");

const announcementSchema = new mongoose.Schema({
  title: String,
  message: String,
  date: { type: Date, default: Date.now },
  department: String
});

module.exports = createTenantModelProxy('Announcement', announcementSchema);