const express = require("express");
const router = express.Router();
const Ticket = require("../models/Ticket");
const Employee = require("../models/Employee");

// GET: Employee Support Tickets Dashboard & Create Page
router.get("/", async (req, res) => {
  const isJson = req.query.format === "json" || req.headers.accept?.includes("application/json");
  try {
    const employee = await Employee.findById(req.session.employeeId);
    if (!employee) {
      if (isJson) return res.status(401).json({ error: "Unauthorized" });
      return res.redirect("/auth/login");
    }

    const myTickets = await Ticket.find({ employeeId: employee._id }).sort({ createdAt: -1 });

    if (isJson) {
      return res.json({ success: true, employee, tickets: myTickets });
    }

    res.render("ticket/index", { employee, tickets: myTickets, success: req.query.success || "", error: req.query.error || "" });
  } catch (err) {
    console.error("Ticket Route Error:", err);
    if (isJson) return res.status(500).json({ error: "Error loading tickets" });
    res.status(500).send("Error loading ticket system");
  }
});

// POST: Create New Support Ticket
router.post("/create", async (req, res) => {
  const isJson = req.query.format === "json" || req.headers.accept?.includes("application/json") || req.body.format === "json";
  try {
    const employee = await Employee.findById(req.session.employeeId);
    if (!employee) {
      if (isJson) return res.status(401).json({ error: "Unauthorized" });
      return res.redirect("/auth/login");
    }

    const { targetDepartment, category, subject, description, priority } = req.body;
    if (!targetDepartment || !category || !subject || !description) {
      if (isJson) return res.status(400).json({ error: "All required fields must be filled" });
      return res.redirect("/ticket?error=Please+fill+all+required+fields");
    }

    const ticket = await Ticket.create({
      employeeId: employee._id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      targetDepartment,
      category,
      subject,
      description,
      priority: priority || "Medium",
      status: "Open"
    });

    if (isJson) {
      return res.json({ success: true, message: "Ticket created successfully", ticket });
    }
    res.redirect("/ticket?success=Support+ticket+raised+successfully");
  } catch (err) {
    console.error("Ticket Creation Error:", err);
    if (isJson) return res.status(500).json({ error: "Failed to create ticket" });
    res.redirect("/ticket?error=" + encodeURIComponent(err.message));
  }
});

// GET: Department / HR Ticket Management Hub
router.get("/manage", async (req, res) => {
  const isJson = req.query.format === "json" || req.headers.accept?.includes("application/json");
  try {
    const employee = await Employee.findById(req.session.employeeId);
    const isHR = req.session.role === "HR";

    let query = {};
    if (!isHR && employee) {
      query.targetDepartment = employee.department;
    }

    const tickets = await Ticket.find(query).sort({ createdAt: -1 });

    if (isJson) {
      return res.json({ success: true, tickets });
    }

    res.render("ticket/manage", { tickets, isHR, employee, success: req.query.success || "", error: req.query.error || "" });
  } catch (err) {
    console.error("Ticket Management Load Error:", err);
    if (isJson) return res.status(500).json({ error: "Error loading management hub" });
    res.status(500).send("Error loading management hub");
  }
});

// POST: Update Ticket Status & Add Comment
router.post("/:id/update", async (req, res) => {
  const isJson = req.query.format === "json" || req.headers.accept?.includes("application/json") || req.body.format === "json";
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      if (isJson) return res.status(404).json({ error: "Ticket not found" });
      return res.redirect("/ticket/manage?error=Ticket+not+found");
    }

    const { status, resolutionNotes, commentText } = req.body;
    if (status) ticket.status = status;
    if (resolutionNotes) ticket.resolutionNotes = resolutionNotes;

    if (commentText) {
      const employee = await Employee.findById(req.session.employeeId);
      const commenterName = employee ? `${employee.firstName} ${employee.lastName}` : (req.session.role === "HR" ? "HR Admin" : "User");
      ticket.comments.push({
        postedBy: commenterName,
        role: req.session.role || "Employee",
        text: commentText
      });
    }

    await ticket.save();

    if (isJson) {
      return res.json({ success: true, message: "Ticket updated", ticket });
    }
    res.redirect("/ticket/manage?success=Ticket+updated+successfully");
  } catch (err) {
    console.error("Ticket Update Error:", err);
    if (isJson) return res.status(500).json({ error: "Error updating ticket" });
    res.redirect("/ticket/manage?error=" + encodeURIComponent(err.message));
  }
});

module.exports = router;
