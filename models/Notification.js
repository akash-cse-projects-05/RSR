const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: String,
  message: String,
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);