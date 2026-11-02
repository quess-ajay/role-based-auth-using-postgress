const express = require("express");
const prisma = require("../lib/prisma");
const { verifyToken } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/roles");

const router = express.Router();

// Get today's date in India.
function getToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  return `${values.year}-${values.month}-${values.day}`;
}

// Store a date-only value consistently for PostgreSQL DATE.
function todayDate() {
  return new Date(`${getToday()}T00:00:00.000Z`);
}

function isStudent(req, res) {
  if (req.user.role !== "USER") {
    res.status(403).json({
      message: "Only students can perform this action",
    });
    return false;
  }

  return true;
}

function handleDatabaseError(res, error, message) {
  if (error.code === "P2002") {
    return res.status(409).json({
      message: "Attendance for today already exists",
    });
  }

  console.error(message, error.message);

  return res.status(500).json({
    message,
  });
}

// Student: Get today's attendance.
router.get("/today", verifyToken, async (req, res) => {
  try {
    if (!isStudent(req, res)) return;

    const attendance = await prisma.attendance.findUnique({
      where: {
        studentId_date: {
          studentId: req.user.id,
          date: todayDate(),
        },
      },
    });

    res.json({ attendance });
  } catch (error) {
    console.error("Today's attendance error:", error.message);
    res.status(500).json({
      message: "Failed to fetch attendance",
    });
  }
});


/* Get attendance history for the logged-in student */
router.get("/history", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "USER") {
      return res.status(403).json({
        message: "Student access only",
      });
    }

    const records = await prisma.attendance.findMany({
      where: {
        studentId: req.user.id,
      },
      orderBy: {
        date: "desc",
      },
    });

    return res.json({ records });
  } catch (error) {
    console.error("Attendance history error:", error);

    return res.status(500).json({
      message: "Could not fetch attendance history",
    });
  }
});


// Student: Check in.
router.post("/check-in", verifyToken, async (req, res) => {
  try {
    if (!isStudent(req, res)) return;

    const attendance = await prisma.attendance.create({
      data: {
        studentId: req.user.id,
        date: todayDate(),
        checkInAt: new Date(),
        status: "PENDING",
      },
    });

    res.status(201).json({
      message: "Check-in submitted for admin approval",
      attendance,
    });
  } catch (error) {
    return handleDatabaseError(
      res,
      error,
      "Failed to check in"
    );
  }
});

// Student: Submit a checkout request.
router.post("/check-out", verifyToken, async (req, res) => {
  try {
    if (!isStudent(req, res)) return;

    const attendance = await prisma.attendance.findUnique({
      where: {
        studentId_date: {
          studentId: req.user.id,
          date: todayDate(),
        },
      },
    });

    if (!attendance || !attendance.checkInAt) {
      return res.status(400).json({
        message: "You must check in before checking out",
      });
    }

    if (attendance.status === "REJECTED") {
      return res.status(400).json({
        message: "Your check-in was rejected",
      });
    }

    if (attendance.status === "ABSENT") {
      return res.status(400).json({
        message: "You cannot check out after marking absent",
      });
    }

    if (attendance.checkOutAt) {
      return res.status(409).json({
        message: "Checkout has already been requested",
      });
    }

    const updatedAttendance = await prisma.attendance.update({
      where: {
        id: attendance.id,
      },
      data: {
        checkOutAt: new Date(),
        checkOutStatus: "PENDING",
      },
    });

    res.json({
      message: "Checkout submitted for admin approval",
      attendance: updatedAttendance,
    });
  } catch (error) {
    console.error("Checkout error:", error.message);
    res.status(500).json({
      message: "Failed to check out",
    });
  }
});

// Student: Manually mark absent.
router.post("/absent", verifyToken, async (req, res) => {
  try {
    if (!isStudent(req, res)) return;

    const attendance = await prisma.attendance.create({
      data: {
        studentId: req.user.id,
        date: todayDate(),
        status: "ABSENT",
      },
    });

    res.status(201).json({
      message: "Marked absent",
      attendance,
    });
  } catch (error) {
    return handleDatabaseError(
      res,
      error,
      "Failed to mark absent"
    );
  }
});

// Admin: Get today's attendance for all students.
router.get(
  "/admin/today",
  verifyToken,
  requireAdmin,
  async (req, res) => {
    try {
      const attendance = await prisma.attendance.findMany({
        where: {
          date: todayDate(),
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      res.json({ attendance });
    } catch (error) {
      console.error("Admin attendance error:", error.message);
      res.status(500).json({
        message: "Failed to fetch attendance",
      });
    }
  }
);

// Admin: Approve or reject check-in.
router.patch(
  "/admin/:id/check-in",
  verifyToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { decision } = req.body;

      if (!["approve", "reject"].includes(decision)) {
        return res.status(400).json({
          message: "Decision must be approve or reject",
        });
      }

      const attendance = await prisma.attendance.findUnique({
        where: { id: req.params.id },
      });

      if (!attendance) {
        return res.status(404).json({
          message: "Attendance not found",
        });
      }

      if (attendance.status !== "PENDING") {
        return res.status(400).json({
          message: "Check-in is not pending approval",
        });
      }

      const updatedAttendance = await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          status: decision === "approve" ? "PRESENT" : "REJECTED",
        },
      });

      res.json({
        message:
          decision === "approve"
            ? "Check-in approved"
            : "Check-in rejected",
        attendance: updatedAttendance,
      });
    } catch (error) {
      console.error("Check-in review error:", error.message);
      res.status(500).json({
        message: "Failed to review check-in",
      });
    }
  }
);

// Admin: Approve or reject checkout.
router.patch(
  "/admin/:id/check-out",
  verifyToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { decision } = req.body;

      if (!["approve", "reject"].includes(decision)) {
        return res.status(400).json({
          message: "Decision must be approve or reject",
        });
      }

      const attendance = await prisma.attendance.findUnique({
        where: { id: req.params.id },
      });

      if (!attendance) {
        return res.status(404).json({
          message: "Attendance not found",
        });
      }

      if (attendance.checkOutStatus !== "PENDING") {
        return res.status(400).json({
          message: "Checkout is not pending approval",
        });
      }

      const updatedAttendance = await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          checkOutStatus:
            decision === "approve" ? "APPROVED" : "REJECTED",
        },
      });

      res.json({
        message:
          decision === "approve"
            ? "Checkout approved"
            : "Checkout rejected",
        attendance: updatedAttendance,
      });
    } catch (error) {
      console.error("Checkout review error:", error.message);
      res.status(500).json({
        message: "Failed to review checkout",
      });
    }
  }
);

module.exports = router;