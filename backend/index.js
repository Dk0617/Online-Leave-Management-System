import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "./db.js";

import loginRoutes from "./routes/loginRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import hodRoutes from "./routes/hodRoutes.js";
import troopRoutes from "./routes/troopRoutes.js";
import squadranRoutes from "./routes/squadranRoutes.js";
import sddRoutes from "./routes/sddRoutes.js";
import gateRoutes from "./routes/gateRoutes.js";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
// Raised from the default 100kb — leave attachments and student photos are
// stored as base64 (capped at ~2.7MB / ~2MB respectively) in the request body.
app.use(express.json({ limit: "6mb" }));

// Test route
app.get("/", (req, res) => {
  res.send("API is running...");
});

app.use("/api/auth", loginRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/hod", hodRoutes);
app.use("/api/troop", troopRoutes);
app.use("/api/squadran", squadranRoutes);
app.use("/api/sdd", sddRoutes);
app.use("/api/gate", gateRoutes);

// Start Server
const startServer = async () => {
  await connectDB();

  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
};

startServer();
