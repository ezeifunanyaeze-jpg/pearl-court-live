const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const dns = require("dns");
require("dotenv").config();

const db = require("./db");

const app = express();

// =====================================================
// ENVIRONMENT CONFIG
// =====================================================

const PORT = process.env.PORT || 5000;
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "temporary-admin-key";

const EMAIL_USER = process.env.EMAIL_USER || "";
const EMAIL_PASS = process.env.EMAIL_PASS || "";

// =====================================================
// CORS CONFIG
// =====================================================

const allowedOrigins = [
  "https://pearl-court-frontend.vercel.app",
  "http://localhost:5173",
  "http://localhost",
  "capacitor://localhost",
  "ionic://localhost",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow:
      // - approved browser origins
      // - server-to-server calls with no origin
      // - Capacitor/Ionic mobile WebView requests
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-admin-api-key"],
  })
);

app.use(express.json({ limit: "10mb" }));

// =====================================================
// ADMIN API KEY MIDDLEWARE
// =====================================================

function requireAdminKey(req, res, next) {
  const key = req.headers["x-admin-api-key"];

  if (!key || key !== ADMIN_API_KEY) {
    return res.status(401).json({
      error: "Unauthorized request",
    });
  }

  next();
}

// =====================================================
// EMAIL TRANSPORTER
// =====================================================
//
// IMPORTANT:
// Render was trying to connect to Gmail over IPv6 and failing with:
// ENETUNREACH 2607:f8b0...
//
// This transporter forces IPv4 DNS lookup and uses port 587.
// This is the correct Gmail SMTP setup for this deployment.
//

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  requireTLS: true,

  // Force IPv4 DNS resolution to avoid Render IPv6 ENETUNREACH errors
  lookup: function (hostname, options, callback) {
    dns.lookup(hostname, { family: 4 }, callback);
  },

  connectionTimeout: 30000,
  greetingTimeout: 30000,
  socketTimeout: 30000,

  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

// =====================================================
// ALLOWED FIRESTORE COLLECTIONS
// =====================================================

const allowedCollections = [
  "users",
  "residents",
  "vehicles",
  "accessCodes",
  "gateLogs",
  "dues",
  "transactions",
  "activities",
  "maintenanceHistory",
  "dieselLog",
  "meetings",
  "activityLog",
  "emails",
];

// =====================================================
// BASIC ROUTES
// =====================================================

app.get("/", (req, res) => {
  res.send("Pearl Court EMS backend is running");
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Pearl Court EMS Backend",
    database: "Firestore",
    emailConfigured: Boolean(EMAIL_USER && EMAIL_PASS),
    time: new Date().toISOString(),
  });
});

// =====================================================
// EMAIL TEST / DEBUG ROUTE
// =====================================================
//
// This confirms whether SMTP login/connection is working.
// It is protected by ADMIN_API_KEY.
//

app.get("/api/email-status", requireAdminKey, async (req, res) => {
  try {
    if (!EMAIL_USER || !EMAIL_PASS) {
      return res.status(500).json({
        ok: false,
        error: "EMAIL_USER or EMAIL_PASS is missing",
      });
    }

    await transporter.verify();

    res.json({
      ok: true,
      message: "Email transporter is ready",
      emailUser: EMAIL_USER,
    });
  } catch (error) {
    console.error("Email transporter verify error:", error);

    res.status(500).json({
      ok: false,
      error: "Email transporter verification failed",
      details: error.message,
      code: error.code || null,
      command: error.command || null,
    });
  }
});

// =====================================================
// GENERIC FIRESTORE API
// =====================================================

// Get all records in a collection
app.get("/api/data/:collection", async (req, res) => {
  try {
    const collectionName = req.params.collection;

    if (!allowedCollections.includes(collectionName)) {
      return res.status(400).json({
        error: "Invalid collection",
      });
    }

    const snapshot = await db.collection(collectionName).get();

    const records = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(records);
  } catch (error) {
    console.error("Fetch collection error:", error);

    res.status(500).json({
      error: "Failed to fetch collection",
      details: error.message,
    });
  }
});

// Add one record to a collection
app.post("/api/data/:collection", requireAdminKey, async (req, res) => {
  try {
    const collectionName = req.params.collection;

    if (!allowedCollections.includes(collectionName)) {
      return res.status(400).json({
        error: "Invalid collection",
      });
    }

    const payload = {
      ...req.body,
      createdAt: req.body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await db.collection(collectionName).add(payload);

    res.status(201).json({
      id: docRef.id,
      ...payload,
    });
  } catch (error) {
    console.error("Add record error:", error);

    res.status(500).json({
      error: "Failed to add record",
      details: error.message,
    });
  }
});

// Replace all records in a collection
// Used by frontend cloud sync.
app.post("/api/data/:collection/replace", requireAdminKey, async (req, res) => {
  try {
    const collectionName = req.params.collection;

    if (!allowedCollections.includes(collectionName)) {
      return res.status(400).json({
        error: "Invalid collection",
      });
    }

    if (!Array.isArray(req.body)) {
      return res.status(400).json({
        error: "Request body must be an array",
      });
    }

    const collectionRef = db.collection(collectionName);
    const snapshot = await collectionRef.get();

    const operations = [];

    snapshot.docs.forEach((doc) => {
      operations.push({
        type: "delete",
        ref: doc.ref,
      });
    });

    req.body.forEach((item) => {
      const newDocRef = collectionRef.doc();

      operations.push({
        type: "set",
        ref: newDocRef,
        data: {
          ...item,
          updatedAt: new Date().toISOString(),
        },
      });
    });

    // Firestore supports max 500 writes per batch.
    // Use 450 for safety.
    const batchSize = 450;

    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = db.batch();
      const chunk = operations.slice(i, i + batchSize);

      chunk.forEach((operation) => {
        if (operation.type === "delete") {
          batch.delete(operation.ref);
        }

        if (operation.type === "set") {
          batch.set(operation.ref, operation.data);
        }
      });

      await batch.commit();
    }

    res.json({
      message: "Collection replaced successfully",
      collection: collectionName,
      count: req.body.length,
    });
  } catch (error) {
    console.error("Replace collection error:", error);

    res.status(500).json({
      error: "Failed to replace collection",
      details: error.message,
    });
  }
});

// Update one record
app.put("/api/data/:collection/:id", requireAdminKey, async (req, res) => {
  try {
    const collectionName = req.params.collection;
    const id = req.params.id;

    if (!allowedCollections.includes(collectionName)) {
      return res.status(400).json({
        error: "Invalid collection",
      });
    }

    const docRef = db.collection(collectionName).doc(id);
    const docSnapshot = await docRef.get();

    if (!docSnapshot.exists) {
      return res.status(404).json({
        error: "Record not found",
      });
    }

    const updatePayload = {
      ...req.body,
      updatedAt: new Date().toISOString(),
    };

    await docRef.update(updatePayload);

    const updatedDoc = await docRef.get();

    res.json({
      id: updatedDoc.id,
      ...updatedDoc.data(),
    });
  } catch (error) {
    console.error("Update record error:", error);

    res.status(500).json({
      error: "Failed to update record",
      details: error.message,
    });
  }
});

// Delete one record
app.delete("/api/data/:collection/:id", requireAdminKey, async (req, res) => {
  try {
    const collectionName = req.params.collection;
    const id = req.params.id;

    if (!allowedCollections.includes(collectionName)) {
      return res.status(400).json({
        error: "Invalid collection",
      });
    }

    const docRef = db.collection(collectionName).doc(id);
    const docSnapshot = await docRef.get();

    if (!docSnapshot.exists) {
      return res.status(404).json({
        error: "Record not found",
      });
    }

    await docRef.delete();

    res.json({
      message: "Record deleted successfully",
      id,
    });
  } catch (error) {
    console.error("Delete record error:", error);

    res.status(500).json({
      error: "Failed to delete record",
      details: error.message,
    });
  }
});

// =====================================================
// REAL EMAIL API
// =====================================================

app.post("/api/send-email", requireAdminKey, async (req, res) => {
  try {
    const { to, subject, message } = req.body;

    if (!to || !subject || !message) {
      return res.status(400).json({
        error: "Recipient email, subject, and message are required",
      });
    }

    if (!EMAIL_USER || !EMAIL_PASS) {
      return res.status(500).json({
        error: "Email service is not configured",
      });
    }

    await transporter.sendMail({
      from: `"Pearl Court EMS" <${EMAIL_USER}>`,
      to,
      subject,
      text: message,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1a1a2e;">
          <h2 style="color:#1a1a2e; margin-bottom: 8px;">Pearl Court EMS</h2>
          <p>${String(message).replace(/\n/g, "<br />")}</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;" />
          <p style="font-size:12px;color:#777;">
            This message was sent from Pearl Court Estate Management System.
          </p>
        </div>
      `,
    });

    res.json({
      success: true,
      message: "Email sent successfully",
    });
  } catch (error) {
    console.error("Send email error:", error);

    res.status(500).json({
      error: "Failed to send email",
      details: error.message,
      code: error.code || null,
      command: error.command || null,
    });
  }
});

// =====================================================
// FALLBACK ROUTE
// =====================================================

app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
  });
});

// =====================================================
// START SERVER
// =====================================================

app.listen(PORT, () => {
  console.log(`Pearl Court EMS backend running on port ${PORT}`);
});
``