
const express = require("express");
const prisma = require("../lib/prisma");
const {
  verifyToken,
  requireManager,
} = require("../middleware/auth");

const router = express.Router();

// All manager routes require authentication and MANAGER role
router.use(verifyToken, requireManager);

// Get all USER and ADMIN accounts
router.get("/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: {
          in: ["USER", "ADMIN"],
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json({ users });
  } catch (error) {
    console.error("Manager users error:", error.message);

    return res.status(500).json({
      message: "Failed to fetch users",
    });
  }
});

// Promote USER to ADMIN or demote ADMIN to USER
router.patch("/users/:id/role", async (req, res) => {
  try {
    const { id } = req.params;
    const role = req.body?.role;

    // Only these two role changes are allowed
    if (!["USER", "ADMIN"].includes(role)) {
  return res.status(400).json({
    message: "Role must be USER or ADMIN",
  });
}

    // Manager cannot change their own role
    if (id === req.user.id) {
      return res.status(403).json({
        message: "You cannot change your own role",
      });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!targetUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Managers cannot change another manager's role
    if (targetUser.role === "MANAGER") {
      return res.status(403).json({
        message: "You cannot change another manager's role",
      });
    }

    // Avoid unnecessary updates
    if (targetUser.role === role) {
      return res.status(400).json({
        message: `User already has the ${role} role`,
      });
    }

    // Update only if the role has not changed since it was fetched
    const result = await prisma.user.updateMany({
      where: {
        id,
        role: targetUser.role,
      },
      data: {
        role,
      },
    });

    if (result.count === 0) {
      return res.status(409).json({
        message: "User role changed. Please refresh and try again.",
      });
    }

    const updatedUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return res.json({
      message: `User role updated to ${role}`,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Manager role update error:", error.message);

    return res.status(500).json({
      message: "Failed to update user role",
    });
  }
});

module.exports = router;
