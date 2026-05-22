const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const db = require("./db");

const app = express();

app.use(cors({ origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] }));
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] },
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
});

// =====================================
// ✅ OVERDUE RULE FUNCTION (15 DAYS)
// =====================================

function checkOverdue(lastPaymentDate) {
  if (!lastPaymentDate) return true;

  const last = new Date(lastPaymentDate);
  const now = new Date();

  const diffDays = (now - last) / (1000 * 60 * 60 * 24);

  return diffDays > 15;
}

// =====================================
// BASIC ROUTES
// =====================================

app.get("/", (req, res) => {
  res.send("Pearl Court backend is running");
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// =====================================
// RESIDENTS
// =====================================

app.get("/api/residents", async (req, res) => {
  const snapshot = await db.collection("residents").get();

  const residents = [];
  snapshot.forEach((doc) => {
    residents.push({ id: doc.id, ...doc.data() });
  });

  res.json(residents);
});

app.post("/api/residents", async (req, res) => {
  const resident = {
    ...req.body,
    duesStatus: "clear",
    accessStatus: "active",
    createdAt: new Date().toISOString(),
  };

  const docRef = await db.collection("residents").add(resident);

  res.json({ id: docRef.id, ...resident });
});

// =====================================
// ACCESS CODES
// =====================================
// ✅ GET all access codes (FIX MISSING ROUTE)

app.get("/api/access-codes", async (req, res) => {
  try {
    const snapshot = await db.collection("accessCodes").get();

    const accessCodes = [];

    snapshot.forEach((doc) => {
      accessCodes.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    res.json(accessCodes);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch access codes",
      details: error.message,
    });
  }
});

app.post("/api/access-codes", async (req, res) => {
  try {
    const { apt, visitorName, residentName } = req.body;

    if (!apt || !visitorName) {
      return res.status(400).json({
        error: "Apartment and visitor name are required",
      });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60000);

    const accessCode = {
      code,
      apt,
      visitorName,
      residentName: residentName || "",
      used: false,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    const docRef = await db.collection("accessCodes").add(accessCode);

    res.json({ id: docRef.id, ...accessCode });
  } catch (error) {
    console.error("Access code error:", error);

    res.status(500).json({
      error: "Failed to create access code",
      details: error.message,
    });
  }
});

// =====================================
// VERIFY CODE + OVERDUE CHECK
// =====================================

app.post("/api/access-codes/verify", async (req, res) => {
  const { code } = req.body;

  const snapshot = await db
    .collection("accessCodes")
    .where("code", "==", code)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return res.status(404).json({
      valid: false,
      error: "Invalid access code",
    });
  }

  const codeDoc = snapshot.docs[0];
  const codeData = codeDoc.data();

  if (codeData.used) {
    return res.json({ valid: false, error: "Already used" });
  }

  if (new Date() > new Date(codeData.expiresAt)) {
    return res.json({ valid: false, error: "Expired" });
  }

  // ✅ CHECK RESIDENT STATUS
  const residentsSnapshot = await db
    .collection("residents")
    .where("apt", "==", codeData.apt)
    .limit(1)
    .get();

  if (!residentsSnapshot.empty) {
    const residentDoc = residentsSnapshot.docs[0];
    const resident = residentDoc.data();

    const overdue = checkOverdue(resident.lastPaymentDate);

    if (overdue || resident.accessStatus === "blocked") {
      return res.status(403).json({
        valid: false,
        error: "Access blocked (unpaid dues)",
      });
    }
  }

  await db.collection("accessCodes").doc(codeDoc.id).update({
    used: true,
  });

  const gateLog = {
    apt: codeData.apt,
    visitorName: codeData.visitorName,
    action: "visitor-entry-approved",
    time: new Date().toISOString(),
  };

  await db.collection("gateLogs").add(gateLog);

  res.json({ valid: true, message: "Access Approved" });
});

// =====================================
// GATE LOGS
// =====================================

app.get("/api/gate-logs", async (req, res) => {
  const snapshot = await db.collection("gateLogs").get();

  const logs = [];
  snapshot.forEach((doc) => {
    logs.push({ id: doc.id, ...doc.data() });
  });

  res.json(logs);
});

// =====================================
// PAYMENTS
// =====================================

app.post("/api/payments", async (req, res) => {
  const { residentId, apt, amount } = req.body;

  const payment = {
    residentId,
    apt,
    amount,
    createdAt: new Date().toISOString(),
  };

  await db.collection("payments").add(payment);

  if (residentId) {
    await db.collection("residents").doc(residentId).update({
      duesStatus: "clear",
      accessStatus: "active",
      lastPaymentDate: new Date().toISOString(),
    });
  }

  res.json({ message: "Payment recorded" });
});

// =====================================

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

const PORT = 5000;

server.listen(PORT, () => {
  console.log("Server running on port 5000");
});