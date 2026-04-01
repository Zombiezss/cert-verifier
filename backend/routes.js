// backend/routes.js
const express = require("express");
const router = express.Router();
const { getContract } = require("./fabric");
const { getDB } = require("./db"); // your Mongo helper

// ================================
// 1) OLD ISSUE ROUTE (Fabric + Mongo, simple fields)
//     -> still available at:  POST /api/issue
// ================================
router.post("/issue", async (req, res) => {
  try {
    const { certId, studentName, course, grade, date } = req.body;

    const contract = await getContract();
    await contract.submitTransaction(
      "issueCertificate",
      certId,
      studentName,
      course,
      grade,
      date
    );

    const db = getDB();
    await db
      .collection(process.env.MONGODB_COLLECTION || "certificates")
      .insertOne({
        certId,
        studentName,
        course,
        grade,
        date,
        createdAt: new Date(),
      });

    res.json({ success: true, message: "Saved to Hyperledger + MongoDB" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ================================
// 2) NEW ISSUE ROUTE FOR REACT IssueForm
//    POST /api/certificates/issue
//    Expects payload from your IssueForm.tsx
// ================================
router.post("/certificates/issue", async (req, res) => {
  try {
    const {
      assetId,            // from frontend, will become certId
      studentName,
      course,
      grade = "N/A",
      issueDate,
      registrationNumber,
      dateOfBirth,
      university,
      studentEmail,
      universityEmail,
      certificateImage = ""  // base64 string
    } = req.body;

    const db = getDB();

    const certificateDoc = {
      certId: assetId,
      studentName,
      registrationNumber,
      dateOfBirth,
      course,
      university,
      studentEmail,
      universityEmail,
      grade,
      issueDate,
      certificateImage,   // ✅ store original certificate image
      createdAt: new Date(),
    };

    const result = await db
      .collection(process.env.MONGODB_COLLECTION || "certificates")
      .insertOne(certificateDoc);

    certificateDoc._id = result.insertedId;

    res.status(201).json({ certificate: certificateDoc });
  } catch (err) {
    console.error("Mongo issue error:", err);
    res.status(500).json({ message: "Issue certificate failed on backend." });
  }
});

// ================================
// 3) VERIFY: read from Fabric
//    GET /api/verify/:id
// ================================
router.get("/verify/:id", async (req, res) => {
  try {
    const certId = req.params.id;

    const contract = await getContract();
    const result = await contract.evaluateTransaction("readCertificate", certId);
    const cert = JSON.parse(result.toString());

    res.json(cert);
  } catch (err) {
    console.error(err);
    res.status(404).json({ error: "Certificate not found" });
  }
});

// ================================
// 4) FEEDBACK ROUTES (Suggestions stored in MongoDB)
//    POST /api/feedback
//    GET  /api/feedback   (optional, for admin view)
// ================================
router.post("/feedback", async (req, res) => {
  try {
    const { page, certId, name, email, message, rating, type } = req.body;

    if (!message || message.trim() === "") {
      return res.status(400).json({ message: "Feedback message is required." });
    }

    const db = getDB();
    const feedbackDoc = {
      page,               // e.g. "IssueForm", "VerifyForm"
      certId,             // optional: related certificate ID
      name,
      email,
      message,
      rating,
      type: type || "suggestion",
      createdAt: new Date(),
    };

    const result = await db.collection("feedback").insertOne(feedbackDoc);
    feedbackDoc._id = result.insertedId;

    res.status(201).json({
      message: "Feedback stored successfully.",
      feedback: feedbackDoc,
    });
  } catch (err) {
    console.error("Feedback save error:", err);
    res.status(500).json({ message: "Failed to store feedback." });
  }
});

// Optional: list feedbacks (for admin dashboard)
router.get("/feedback", async (req, res) => {
  try {
    const db = getDB();
    const feedbacks = await db
      .collection("feedback")
      .find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    res.json({ feedbacks });
  } catch (err) {
    console.error("Feedback fetch error:", err);
    res.status(500).json({ message: "Failed to fetch feedback." });
  }
});

module.exports = router;
