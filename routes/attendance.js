const express = require("express");
const router = express.Router();
const Attendance = require("../models/Attendence");


// ================= GET ATTENDANCE PAGE =================
router.get("/", async (req, res) => {
  try {
    if (!req.session.employeeId) {
      return res.redirect("/auth/login");
    }

    const today = new Date().toISOString().slice(0, 10);

    const attendance = await Attendance.findOne({
      employeeId: req.session.employeeId,
      date: today
    });

    res.render("attendance/today", {
      attendance: attendance || null
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading attendance page");
  }
});

// Punch In
router.post("/punch-in", async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const today = new Date().toISOString().slice(0, 10);

    // OFFICE COORDINATES (RSR Aviation Head Office)
    const OFFICE_LAT = 19.05973973209058;
    const OFFICE_LNG = 73.11899471349244;
    const ALLOWED_RADIUS_METERS = 200;

    // Haversine Formula for Distance Calculation
    function getDistanceInMeters(lat1, lon1, lat2, lon2) {
      const R = 6371e3; // Earth radius in meters
      const φ1 = lat1 * Math.PI / 180;
      const φ2 = lat2 * Math.PI / 180;
      const Δφ = (lat2 - lat1) * Math.PI / 180;
      const Δλ = (lon2 - lon1) * Math.PI / 180;

      const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c;
    }

    if (!lat || !lng) {
      return res.json({ success: false, message: "Location data missing." });
    }

    const distance = getDistanceInMeters(lat, lng, OFFICE_LAT, OFFICE_LNG);
    console.log(`Punch-In Attempt. Dist: ${distance.toFixed(2)}m`);

    if (distance > ALLOWED_RADIUS_METERS) {
      return res.json({ success: false, message: `You are ${Math.round(distance)}m away from office. Must be within ${ALLOWED_RADIUS_METERS}m.` });
    }

    await Attendance.create({
      employeeId: req.session.employeeId,
      date: today,
      punchIn: new Date(),
      punchInLocation: {
        lat: lat || null,
        lng: lng || null
      }
    });

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// WFH Punch In (Location Optional)
router.post("/location-optional-punch-in", async (req, res) => {
  try {
    const { lat, lng, wfh, reason } = req.body;
    const today = new Date().toISOString().slice(0, 10);

    // Check if already punched in
    const existing = await Attendance.findOne({
      employeeId: req.session.employeeId,
      date: today
    });

    const Employee = require("../models/Employee"); // Ensure Employee is imported

    if (existing) {
      return res.json({ success: false, message: "Already marked attendance for today" });
    }

    // VERIFY WFH ALLOTMENT
    const employee = await Employee.findById(req.session.employeeId);
    let isAuthorized = false;

    if (employee && employee.wfhSchedule && employee.wfhSchedule.startDate && employee.wfhSchedule.endDate) {
      const currentDate = new Date(today); // 'YYYY-MM-DD' is debatable, better to use strict logic
      const start = new Date(employee.wfhSchedule.startDate);
      const end = new Date(employee.wfhSchedule.endDate);

      // Normalize time for comparison
      const checkDate = new Date();
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      if (checkDate >= start && checkDate <= end) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.json({ success: false, message: "Work From Home is not authorized for today. Please contact your manager." });
    }

    await Attendance.create({
      employeeId: req.session.employeeId,
      date: today,
      punchIn: new Date(),
      punchInLocation: {
        lat: lat || null,
        lng: lng || null
      },
      workFromHome: wfh === true,
      wfhReason: reason || "No reason provided"
    });

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// Punch Out
router.post("/punch-out", async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const today = new Date().toISOString().slice(0, 10);

    const attendance = await Attendance.findOne({
      employeeId: req.session.employeeId,
      date: today
    });

    if (!attendance) {
      return res.status(404).json({ success: false, message: "Attendance not found" });
    }

    const punchOutTime = new Date();
    const punchInTime = new Date(attendance.punchIn);

    // Calculate total time in milliseconds
    const timeDiff = punchOutTime - punchInTime;
    const totalMinutes = Math.floor(timeDiff / (1000 * 60));
    const totalHours = (timeDiff / (1000 * 60 * 60)).toFixed(2);

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const workDuration = `${hours}h ${minutes}m`;

    await Attendance.findOneAndUpdate(
      {
        employeeId: req.session.employeeId,
        date: today
      },
      {
        punchOut: punchOutTime,
        punchOutLocation: {
          lat: lat || null,
          lng: lng || null
        },
        totalHours: parseFloat(totalHours),
        totalMinutes: totalMinutes,
        workDuration: workDuration
      }
    );

    res.json({
      success: true,
      totalHours: totalHours,
      totalMinutes: totalMinutes
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});



module.exports = router;
