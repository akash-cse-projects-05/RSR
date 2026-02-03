const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: String,
  file: Buffer,
  fileType: String,
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  },
  uploadedAt: { type: Date, default: Date.now },
  overallStatus: {
    type: String,
    enum: ['OPEN', 'CLOSED'],
    default: 'OPEN'
  }
  
});

module.exports = mongoose.model('Document', documentSchema);