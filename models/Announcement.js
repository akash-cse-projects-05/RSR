const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: String,
  message: String,
  date: { type: Date, default: Date.now },
  department: String
});

module.exports = mongoose.model('Announcement', announcementSchema);