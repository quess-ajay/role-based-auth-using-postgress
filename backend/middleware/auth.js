
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");

// Verify JWT and fetch the user's current details from PostgreSQL
async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Login required",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: {
        id: decoded.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
}

// Allow only ADMIN users
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({
      message: "Admin access only",
    });
  }

  next();
}

// Allow only MANAGER users
function requireManager(req, res, next) {
  if (!req.user || req.user.role !== "MANAGER") {
    return res.status(403).json({
      message: "Manager access only",
    });
  }

  next();
}

module.exports = {
  verifyToken,
  requireAdmin,
  requireManager,
};
