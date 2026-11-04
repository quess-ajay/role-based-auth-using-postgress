require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());


const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);

const attendanceRoutes = require("./routes/attendance");
app.use("/api/attendance", attendanceRoutes);

const managerRoutes = require("./routes/manager");
app.use("/api/manager", managerRoutes);


// Test route
app.get("/", (req, res) => {
  res.json({
    message: "Role-based attendance API is running",
  });
});

// Database connection test
app.get("/api/health", async (req, res) => {
  try {
    const prisma = require("./lib/prisma");

    await prisma.$queryRaw`SELECT 1`;

    res.json({
      server: "running",
      database: "connected",
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);

    res.status(500).json({
      server: "running",
      database: "disconnected",
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});