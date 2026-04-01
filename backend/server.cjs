// --- LOAD ENV FIRST ---
const path = require('path');
require('dotenv').config({
  path: path.join(__dirname, '.env')
});

// --- CORE IMPORTS ---
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { Gateway, Wallets } = require('fabric-network');
const nodemailer = require('nodemailer');

// ✅ USE MODEL FILES
const Feedback = require('./models/Feedback.cjs'); // Feedback model (CommonJS)

// --- APP ---
const app = express();
const PORT = process.env.PORT || 4000;

// --- CONFIG ---
const MONGODB_URI = process.env.MONGODB_URI || '';
const USE_REAL_FABRIC = process.env.USE_REAL_FABRIC === 'true';
const AS_LOCALHOST = process.env.AS_LOCALHOST !== 'false';

const FABRIC_CCP_PATH =
  process.env.FABRIC_CCP_PATH || path.resolve(__dirname, 'connection-org1.json');
const FABRIC_WALLET_PATH =
  process.env.FABRIC_WALLET_PATH || path.join(__dirname, 'wallet');
const CHANNEL_NAME = 'mychannel';
const CHAINCODE_NAME = 'certificate_cc';

console.log('🚀 Backend starting...');
console.log('MONGODB_URI present?:', !!MONGODB_URI);
console.log('USE_REAL_FABRIC:', USE_REAL_FABRIC);
console.log('FABRIC_CCP_PATH:', FABRIC_CCP_PATH);
console.log('FABRIC_WALLET_PATH:', FABRIC_WALLET_PATH);

// --- EMAIL ---
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER || 'test@example.com',
    pass: EMAIL_PASS || 'test'
  }
});

// --- MIDDLEWARE ---
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'] }));
app.use(bodyParser.json({ limit: '50mb' }));

// --- MONGODB CONNECT ---
if (MONGODB_URI) {
  mongoose
    .connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('❌ MongoDB error:', err.message));
} else {
  console.log('⚠ No MONGODB_URI set. Data will NOT be saved.');
}

// --- MONGOOSE MODELS ---

// Student model (inline)
const studentSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  usn: String,
  department: String,
  passwordHash: String
});

const Student = mongoose.model('Student', studentSchema);

// Certificate model (extended to store full data + image)
const certificateSchema = new mongoose.Schema({
  certId: { type: String, unique: true },

  // core details
  studentName: String,
  registrationNumber: String,
  dateOfBirth: String,
  course: String,
  university: String,

  // contact
  studentEmail: String,
  universityEmail: String,

  // status / metadata
  grade: String, // e.g. "A+" or "N/A"
  date: String, // issue date, e.g. "2025-11-30"
  certificateImage: String, // base64/image data URL from scan
  txId: String // Fabric transaction ID (optional)
});

const Certificate = mongoose.model('Certificate', certificateSchema);

// --- SIMPLE HELPERS ---
const hashPassword = plain =>
  crypto.createHash('sha256').update(plain).digest('hex');

// Fabric helper (used only if USE_REAL_FABRIC = true)
async function getContract() {
  if (!USE_REAL_FABRIC) {
    console.log('ℹ️ USE_REAL_FABRIC=false → skipping Fabric connect');
    return null;
  }

  if (!fs.existsSync(FABRIC_CCP_PATH)) {
    throw new Error(`Fabric connection profile not found at: ${FABRIC_CCP_PATH}`);
  }

  const ccpRaw = fs.readFileSync(FABRIC_CCP_PATH, 'utf8');
  let ccp;
  try {
    ccp = JSON.parse(ccpRaw);
  } catch (e) {
    console.error('❌ Failed to parse connection-org1.json:', e.message);
    throw e;
  }

  const wallet = await Wallets.newFileSystemWallet(FABRIC_WALLET_PATH);

  const gateway = new Gateway();
  await gateway.connect(ccp, {
    wallet,
    identity: 'appUser', // must match registerUser.cjs
    discovery: { enabled: true, asLocalhost: AS_LOCALHOST }
  });

  const network = await gateway.getNetwork(CHANNEL_NAME);
  const contract = network.getContract(CHAINCODE_NAME);
  return { gateway, contract };
}

// -----------------------------
// ✅ BASIC TEST ROUTES
// -----------------------------
app.get('/', (req, res) => {
  res.send('Backend is working ✔️');
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mongodb: !!MONGODB_URI,
    fabric: USE_REAL_FABRIC
  });
});

// -----------------------------
// 👤 AUTH ROUTES (SIMPLE)
// -----------------------------

// Simple GET route so browser "GET /api/login" works
app.get('/api/login', (req, res) => {
  res.send('Login API is working ✔️ Use POST for actual login.');
});

// Simple GET route so browser "GET /api/register" works
app.get('/api/register', (req, res) => {
  res.send('Register API is working ✔️ Use POST for actual registration.');
});

// Register student (POST)
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, usn, department, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const passwordHash = hashPassword(password);

    const student = await Student.create({
      name,
      email,
      usn,
      department,
      passwordHash
    });

    return res.status(201).json({
      message: 'Student registered',
      studentId: student._id
    });
  } catch (err) {
    console.error('Register error:', err);

    // Handle duplicate email nicely
    if (err.code === 11000 && err.keyPattern && err.keyPattern.email) {
      return res.status(400).json({
        message: 'This email is already registered. Please use another email.'
      });
    }

    return res.status(500).json({
      message: 'Register failed',
      error: err.message
    });
  }
});

// Login student (real API, POST)
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const passwordHash = hashPassword(password || '');

    const student = await Student.findOne({ email });

    if (!student || student.passwordHash !== passwordHash) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      message: 'Login success',
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        usn: student.usn
      }
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
});

// -----------------------------
// 🎓 CERTIFICATE ROUTES
// -----------------------------

// Issue certificate (save in MongoDB + send to Fabric if enabled)
app.post('/api/certificates/issue', async (req, res) => {
  console.log('📥 Issue request body:', req.body);

  const {
    assetId,
    certId,
    studentName,
    course,
    grade,
    date,
    issueDate,
    registrationNumber,
    dateOfBirth,
    university,
    studentEmail,
    universityEmail,
    certificateImage
  } = req.body;

  // Accept either certId or assetId, and either date or issueDate
  const finalCertId = (certId || assetId || '').trim();
  const finalDate = (date || issueDate || '').trim();
  const finalGrade = grade || 'N/A';

  if (!finalCertId || !studentName || !course || !finalDate) {
    return res.status(400).json({
      message:
        'Missing required fields (certId/assetId, studentName, course, date/issueDate)'
    });
  }

  try {
    let txId = null;

    // 1) Send to Fabric (optional)
    if (USE_REAL_FABRIC) {
      try {
        const { gateway, contract } = await getContract();

        const tx = await contract.submitTransaction(
          'issueCertificate',
          finalCertId,
          studentName,
          course,
          finalGrade,
          finalDate
        );

        txId = tx ? tx.toString() : 'fabric-tx';
        await gateway.disconnect();
        console.log('✅ Fabric tx success for certId:', finalCertId, 'txId:', txId);
      } catch (fabricErr) {
        console.error('❌ Fabric error (issueCertificate):', fabricErr.message);
        // You can choose: either fail completely or continue with only MongoDB
        // Here we continue but include info in response:
      }
    } else {
      console.log('ℹ️ Fabric disabled → skipping chaincode call');
    }

    // 2) Save in MongoDB (full record including image)
    const cert = await Certificate.create({
      certId: finalCertId,
      studentName,
      registrationNumber,
      dateOfBirth,
      course,
      university,
      studentEmail,
      universityEmail,
      grade: finalGrade,
      date: finalDate,
      certificateImage, // may be undefined if not sent
      txId
    });

    console.log('✅ Mongo certificate saved:', cert._id);

    return res.status(201).json({
      message: 'Certificate issued',
      certificate: cert
    });
  } catch (err) {
    console.error('Issue cert error:', err);
    return res.status(500).json({
      message: 'Issue certificate failed',
      error: err.message
    });
  }
});

// Get certificate by certId (from MongoDB)
app.get('/api/certificates/:certId', async (req, res) => {
  try {
    const cert = await Certificate.findOne({ certId: req.params.certId });
    if (!cert) {
      return res.status(404).json({ message: 'Certificate not found' });
    }
    res.json(cert);
  } catch (err) {
    console.error('Get cert error:', err.message);
    res.status(500).json({
      message: 'Get certificate failed',
      error: err.message
    });
  }
});

// Simple verify: check if cert exists in MongoDB + optional DOB match
app.post('/api/certificates/verify', async (req, res) => {
  const { certId, assetId, dob } = req.body;
  const id = (certId || assetId || '').trim();

  console.log('🔎 Verify request body:', req.body, ' -> using id:', id);

  if (!id) {
    return res.status(400).json({ message: 'certId or assetId required' });
  }

  try {
    const cert = await Certificate.findOne({ certId: id });

    if (!cert) {
      return res.json({
        valid: false,
        reason: 'Not found in database'
      });
    }

    // If DOB provided, enforce match
    if (dob) {
      const normalizeDob = s =>
        String(s || '')
          .trim()
          .replace(/[^0-9-]/g, '');

      const inputDob = normalizeDob(dob);
      const storedDob = normalizeDob(cert.dateOfBirth);

      console.log('👀 DOB compare:', { inputDob, storedDob });

      if (storedDob && inputDob && storedDob !== inputDob) {
        return res.json({
          valid: false,
          reason: 'DOB mismatch',
          message: 'Date of Birth does not match our records.'
        });
      }
    }

    // All checks passed → valid
    return res.json({
      valid: true,
      certificate: cert
    });
  } catch (err) {
    console.error('Verify cert error:', err);
    return res.status(500).json({
      message: 'Verify failed',
      error: err.message
    });
  }
});

//
// ✅ FEEDBACK ROUTES
//
app.post('/api/feedback', async (req, res) => {
  try {
    const { page, certId, name, email, message, rating, type } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ message: 'Feedback message is required.' });
    }

    const feedback = await Feedback.create({
      page,
      certId,
      name,
      email,
      message,
      rating,
      type: type || 'suggestion'
    });

    return res.status(201).json({
      message: 'Feedback stored successfully.',
      feedback
    });
  } catch (err) {
    console.error('Feedback save error:', err);
    return res.status(500).json({
      message: 'Failed to store feedback.',
      error: err.message
    });
  }
});

// Optional: view last 100 feedback entries
app.get('/api/feedback', async (req, res) => {
  try {
    const feedbacks = await Feedback.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json({ feedbacks });
  } catch (err) {
    console.error('Feedback fetch error:', err);
    res.status(500).json({
      message: 'Failed to fetch feedback.',
      error: err.message
    });
  }
});

// --- START SERVER ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 DB: ${MONGODB_URI ? 'MongoDB Atlas' : 'Local JSON'}`);
  console.log(`🔗 Fabric: ${USE_REAL_FABRIC ? 'Real Network' : 'Simulation'}`);
});
