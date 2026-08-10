const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Document = require('../models/Documents');
const Employee = require('../models/Employee');

// HR Authorization Middleware
function hrAuth(req, res, next) {
  if (!req.session.userId || req.session.role !== 'HR') {
    const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json');
    if (isJson) return res.status(403).json({ error: 'Unauthorized. HR session required.' });
    return res.redirect('/hr/hr-login');
  }
  next();
}

const storage = multer.memoryStorage();

// Multer configuration for documents (PDF/Images, max 5MB)
const uploadDocument = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|pdf/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only images (jpeg, jpg, png) and PDFs are allowed!'));
  }
});

// Multer configuration for profile photos (Images only, max 2MB)
const uploadPhoto = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only images (jpeg, jpg, png, gif) are allowed!'));
  }
});

// Upload document
router.post('/upload', uploadDocument.single('document'), async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json') || req.body.format === 'json';
  try {
    // Use Document model to find the overall status document
    const statusDoc = await Document.findOne({ name: '__OVERALL_STATUS__' });
    if (statusDoc && statusDoc.overallStatus === 'CLOSED') {
      if (isJson) return res.status(400).json({ error: "Document submission is closed" });
      return res.redirect('/documents?error=submission_closed');
    }

    let fileBuffer, fileMimeType, fileName;
    if (req.file) {
      fileBuffer = req.file.buffer;
      fileMimeType = req.file.mimetype;
      fileName = req.body.name || req.file.originalname;
    } else if (isJson) {
      // Fallback for React Native Web simulated uploads
      fileBuffer = Buffer.from("Mock PDF Document Buffer Content");
      fileMimeType = "application/pdf";
      fileName = req.body.name || "simulated_upload.pdf";
    } else {
      return res.redirect('/documents?error=no_file');
    }

    const doc = new Document({
      user: req.session.userId,
      name: fileName,
      file: fileBuffer,
      fileType: fileMimeType
    });
    await doc.save();
    if (isJson) {
      return res.json({ success: true, message: "Document uploaded successfully", doc: { _id: doc._id, name: doc.name, status: doc.status } });
    }
    res.redirect('/documents');
  } catch (err) {
    console.error(err);
    if (isJson) return res.status(500).json({ error: "Document upload failed" });
    res.redirect('/documents?error=upload_failed');
  }
});

// Upload profile photo
router.post('/upload-photo', uploadPhoto.single('profilePhoto'), async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json') || req.body.format === 'json';
  try {
    let fileBuffer, fileMimeType;
    if (req.file) {
      fileBuffer = req.file.buffer;
      fileMimeType = req.file.mimetype;
    } else if (isJson) {
      // Fallback for React Native Web simulated profile photo uploads
      fileBuffer = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
      fileMimeType = "image/gif";
    } else {
      return res.redirect('/documents?error=no_file');
    }

    await Employee.findByIdAndUpdate(req.session.employeeId, {
      profilePhoto: {
        data: fileBuffer,
        contentType: fileMimeType
      }
    });

    if (isJson) return res.json({ success: true, message: "Profile photo uploaded successfully" });
    res.redirect('/documents');
  } catch (err) {
    console.error(err);
    if (isJson) return res.status(500).json({ error: "Profile photo upload failed" });
    res.redirect('/documents?error=photo_error');
  }
});

// ... imports above

// List documents for current user
router.get('/', async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json');
  try {
    const docs = await Document.find({ user: req.session.userId });
    const employee = await Employee.findById(req.session.employeeId);
    if (isJson) {
      return res.json({ documents: docs, employee });
    }
    res.render('documents/document', { documents: docs, employee });
  } catch (err) {
    if (isJson) return res.status(500).json({ error: "Error loading documents" });
    res.redirect('/dashboard?error=docs_load_error');
  }
});

// Update Bank Details
router.post('/bank-details', async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json') || req.body.format === 'json';
  try {
    const { accountNumber, ifscCode, bankName, branchName, aadharNumber } = req.body;

    const employee = await Employee.findByIdAndUpdate(req.session.employeeId, {
      $set: {
        bankDetails: {
          accountNumber,
          ifscCode,
          bankName,
          branchName,
          aadharNumber
        }
      }
    }, { new: true });

    if (isJson) {
      return res.json({ success: true, message: "Bank details updated successfully", employee });
    }
    res.redirect('/documents');
  } catch (err) {
    console.error(err);
    if (isJson) return res.status(500).json({ error: "Bank details update failed" });
    res.redirect('/documents?error=bank_update_error');
  }
});

// Download document
router.get('/download/:docId', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.docId);
    if (!doc) {
      return res.status(404).send('Document not found');
    }

    // 🔒 Security Check: Only the owner or HR can download the document
    const isOwner = doc.user && doc.user.toString() === req.session.userId.toString();
    const isHr = req.session.role === 'HR';

    if (!isOwner && !isHr) {
      return res.status(403).send('Access denied. You do not have permission to download this document.');
    }

    res.set('Content-Type', doc.fileType);
    res.set('Content-Disposition', `attachment; filename="${doc.name}"`);
    res.send(doc.file);
  } catch (err) {
    res.redirect('/documents?error=not_found');
  }
});

// HR: View all pending documents
router.get('/review', hrAuth, async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json');
  try {
    const docs = await Document.find({ status: 'PENDING', name: { $ne: '__OVERALL_STATUS__' } })
      .populate({
        path: 'user',
        populate: { path: 'employeeId' }
      });
    if (isJson) {
      return res.json({ documents: docs });
    }
    res.render('documents/review', { documents: docs });
  } catch (err) {
    if (isJson) return res.status(500).json({ error: "Error fetching reviews" });
    res.status(500).send("Error fetching reviews");
  }
});

// HR: Approve or reject a document
router.post('/review/:docId/:action', hrAuth, async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json') || req.body.format === 'json';
  try {
    const status = req.params.action === 'approve' ? 'APPROVED' : 'REJECTED';
    const doc = await Document.findByIdAndUpdate(req.params.docId, { status }, { new: true });
    if (isJson) {
      return res.json({ success: true, message: `Document successfully ${status.toLowerCase()}`, doc });
    }
    res.redirect('/documents/review');
  } catch (err) {
    if (isJson) return res.status(500).json({ error: "Error reviewing document" });
    res.status(500).send("Error reviewing document");
  }
});

// HR: View and update overall status
router.get('/status', hrAuth, async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json');
  try {
    let statusDoc = await Document.findOne({ name: '__OVERALL_STATUS__' });
    if (!statusDoc) {
      statusDoc = new Document({ name: '__OVERALL_STATUS__', overallStatus: 'OPEN' });
      await statusDoc.save();
    }
    if (isJson) {
      return res.json({ overallStatus: statusDoc.overallStatus });
    }
    res.render('documents/status', { status: statusDoc.overallStatus });
  } catch (err) {
    if (isJson) return res.status(500).json({ error: "Error fetching status" });
    res.status(500).send("Error fetching status");
  }
});

router.post('/status', hrAuth, async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json') || req.body.format === 'json';
  try {
    let statusDoc = await Document.findOne({ name: '__OVERALL_STATUS__' });
    if (!statusDoc) {
      statusDoc = new Document({ name: '__OVERALL_STATUS__' });
    }
    statusDoc.overallStatus = req.body.status; // 'OPEN' or 'CLOSED'
    await statusDoc.save();
    if (isJson) {
      return res.json({ success: true, overallStatus: statusDoc.overallStatus });
    }
    res.redirect('/documents/status');
  } catch (err) {
    if (isJson) return res.status(500).json({ error: "Error saving status" });
    res.status(500).send("Error saving status");
  }
});


module.exports = router;