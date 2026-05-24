const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const db = require("./db");

const app = express();

// =========================
// ADMIN API KEY PROTECTION
// =========================
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "temporary-admin-key";

function requireAdminKey(req, res, next) {
  const key = req.headers["x-admin-api-key"];

  if (!key || key !== ADMIN_API_KEY) {
    return res.status(401).json({
      error: "Unauthorized request",
    });
  }

  next();
}

// =========================
// CORS (SAFE + STABLE)
// =========================
const allowedOrigins = [
  "https://pearl-court-frontend.vercel.app",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "x-admin-api-key"],
  })
);

app.use(express.json());

// =========================
// SOCKET.IO (OPTIONAL)
// =========================
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
});

// =========================
// BASIC ROUTES
// =========================
app.get("/", (req, res) => {
  res.send("Pearl Court Backend Running");
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// =========================
// GENERIC FIRESTORE API
// =========================
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

// GET collection
app.get("/api/data/:collection", async (req, res) => {
  try {
    const collectionName = req.params.collection;

    if (!allowedCollections.includes(collectionName)) {
      return res.status(400).json({ error: "Invalid collection" });
    }

    const snapshot = await db.collection(collectionName).get();

    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

// ADD new record
app.post("/api/data/:collection", requireAdminKey, async (req, res) => {
  try {
    const collectionName = req.params.collection;

    if (!allowedCollections.includes(collectionName)) {
      return res.status(400).json({ error: "Invalid collection" });
    }

    const payload = {
      ...req.body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await db.collection(collectionName).add(payload);

    res.json({
      id: docRef.id,
      ...payload,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to add record" });
  }
});

// REPLACE collection (bulk)
app.post(
  "/api/data/:collection/replace",
  requireAdminKey,
  async (req, res) => {
    try {
      const collectionName = req.params.collection;

      if (!allowedCollections.includes(collectionName)) {
        return res.status(400).json({ error: "Invalid collection" });
      }

      if (!Array.isArray(req.body)) {
        return res.status(400).json({ error: "Body must be array" });
      }

      const collectionRef = db.collection(collectionName);
      const snapshot = await collectionRef.get();

      const batch = db.batch();

      // delete old
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });

      // add new
      req.body.forEach(item => {
        const newRef = collectionRef.doc();
        batch.set(newRef, {
          ...item,
          updatedAt: new Date().toISOString(),
        });
      });

      await batch.commit();

      res.json({
        message: "Collection replaced",
        count: req.body.length,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Replace failed" });
    }
  }
);

// UPDATE record
app.put(
  "/api/data/:collection/:id",
  requireAdminKey,
  async (req, res) => {
    try {
      const { collection, id } = req.params;

      if (!allowedCollections.includes(collection)) {
        return res.status(400).json({ error: "Invalid collection" });
      }

      const ref = db.collection(collection).doc(id);

      await ref.update({
        ...req.body,
        updatedAt: new Date().toISOString(),
      });

      const updated = await ref.get();

      res.json({
        id: updated.id,
        ...updated.data(),
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Update failed" });
    }
  }
);

// DELETE record
app.delete(
  "/api/data/:collection/:id",
  requireAdminKey,
  async (req, res) => {
    try {
      const { collection, id } = req.params;

      if (!allowedCollections.includes(collection)) {
        return res.status(400).json({ error: "Invalid collection" });
      }

      await db.collection(collection).doc(id).delete();

      res.json({ message: "Deleted", id });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Delete failed" });
    }
  }
);

// =========================
// START SERVER
// =========================
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});