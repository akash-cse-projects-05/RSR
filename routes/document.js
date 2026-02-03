const express = require('express');
const router = express.Router();
const multer = require('multer');
const Document = require('../models/Documents');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Upload document
router.post('/upload', upload.single('document'), async (req, res) => {
  try {
    // Use Document model to find the overall status document
    const statusDoc = await Document.findOne({ name: '__OVERALL_STATUS__' });
    if (statusDoc && statusDoc.overallStatus === 'CLOSED') {
      return res.status(403).send('Document submission is closed.');
    }
    const doc = new Document({
      user: req.session.userId,
      name: req.body.name,
      file: req.file.buffer,
      fileType: req.file.mimetype
    });
    await doc.save();
    res.redirect('/documents');
  } catch (err) {
    res.status(500).send('Upload failed');
  }
});

// Upload profile photo
router.post('/upload-photo', upload.single('profilePhoto'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }

    await Employee.findByIdAndUpdate(req.session.employeeId, {
      profilePhoto: {
        data: req.file.buffer,
        contentType: req.file.mimetype
      }
    });

    res.redirect('/documents');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error uploading photo');
  }
});

const Employee = require('../models/Employee');

// ... imports above

// List documents for current user
router.get('/', async (req, res) => {
  try {
    const docs = await Document.find({ user: req.session.userId });
    const employee = await Employee.findById(req.session.employeeId);
    res.render('documents/document', { documents: docs, employee });
  } catch (err) {
    res.status(500).send('Error loading documents');
  }
});

// Update Bank Details
router.post('/bank-details', async (req, res) => {
  try {
    const { accountNumber, ifscCode, bankName, branchName, aadharNumber } = req.body;

    await Employee.findByIdAndUpdate(req.session.employeeId, {
      $set: {
        bankDetails: {
          accountNumber,
          ifscCode,
          bankName,
          branchName,
          aadharNumber
        }
      }
    });

    res.redirect('/documents');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error updating bank details');
  }
});

// Download document
router.get('/download/:docId', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.docId);
    res.set('Content-Type', doc.fileType);
    res.set('Content-Disposition', `attachment; filename="${doc.name}"`);
    res.send(doc.file);
  } catch (err) {
    res.status(404).send('Document not found');
  }
});





// HR: View all pending documents
router.get('/review', async (req, res) => {
  const docs = await Document.find({ status: 'PENDING', name: { $ne: '__OVERALL_STATUS__' } }).populate('user');
  res.render('documents/review', { documents: docs });
});

// HR: Approve or reject a document
router.post('/review/:docId/:action', async (req, res) => {
  const status = req.params.action === 'approve' ? 'APPROVED' : 'REJECTED';
  await Document.findByIdAndUpdate(req.params.docId, { status });
  res.redirect('/documents/review');
});

// HR: View and update overall status
router.get('/status', async (req, res) => {
  let statusDoc = await Document.findOne({ name: '__OVERALL_STATUS__' });
  if (!statusDoc) {
    statusDoc = new Document({ name: '__OVERALL_STATUS__', overallStatus: 'OPEN' });
    await statusDoc.save();
  }
  res.render('documents/status', { status: statusDoc.overallStatus });
});

router.post('/status', async (req, res) => {
  let statusDoc = await Document.findOne({ name: '__OVERALL_STATUS__' });
  if (!statusDoc) {
    statusDoc = new Document({ name: '__OVERALL_STATUS__' });
  }
  statusDoc.overallStatus = req.body.status; // 'OPEN' or 'CLOSED'
  await statusDoc.save();
  res.redirect('/documents/status');
});


module.exports = router;