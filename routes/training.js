const express = require("express");
const router = express.Router();
const Training = require("../models/Training");
const Employee = require("../models/Employee");

// GET: Employee Training Portal View
router.get("/", async (req, res) => {
  const isJson = req.query.format === "json" || req.headers.accept?.includes("application/json");
  try {
    const employeeId = req.session.employeeId;
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      if (isJson) return res.status(401).json({ error: "Unauthorized" });
      return res.redirect("/auth/login");
    }

    // Find modules assigned to ALL or to employee's department or specifically to this employee
    const trainings = await Training.find({
      $or: [
        { targetDepartment: "ALL" },
        { targetDepartment: employee.department },
        { "assignedEmployees.employeeId": employeeId }
      ]
    }).sort({ createdAt: -1 });

    const enrichedTrainings = trainings.map(t => {
      const record = t.assignedEmployees.find(a => a.employeeId?.toString() === employeeId?.toString());
      return {
        ...t.toObject(),
        myStatus: record ? record.status : "Pending",
        myCompletedAt: record ? record.completedAt : null
      };
    });

    if (isJson) {
      return res.json({ success: true, trainings: enrichedTrainings });
    }

    res.render("training/index", { employee, trainings: enrichedTrainings, success: req.query.success || "", error: req.query.error || "" });
  } catch (err) {
    console.error("Training Portal Error:", err);
    if (isJson) return res.status(500).json({ error: "Error loading training portal" });
    res.status(500).send("Error loading training portal");
  }
});

// POST: Mark Training Module as Completed
router.post("/:id/complete", async (req, res) => {
  const isJson = req.query.format === "json" || req.headers.accept?.includes("application/json") || req.body.format === "json";
  try {
    const employeeId = req.session.employeeId;
    const training = await Training.findById(req.params.id);

    if (!training) {
      if (isJson) return res.status(404).json({ error: "Training module not found" });
      return res.redirect("/training?error=Module+not+found");
    }

    let record = training.assignedEmployees.find(a => a.employeeId?.toString() === employeeId?.toString());
    if (!record) {
      training.assignedEmployees.push({
        employeeId,
        status: "Completed",
        completedAt: new Date()
      });
    } else {
      record.status = "Completed";
      record.completedAt = new Date();
    }

    await training.save();

    if (isJson) {
      return res.json({ success: true, message: "Training marked as completed" });
    }
    res.redirect("/training?success=Training+module+completed+successfully");
  } catch (err) {
    console.error("Training Completion Error:", err);
    if (isJson) return res.status(500).json({ error: "Error marking training complete" });
    res.redirect("/training?error=" + encodeURIComponent(err.message));
  }
});

// GET: HR Training Management Dashboard
router.get("/manage", async (req, res) => {
  const isJson = req.query.format === "json" || req.headers.accept?.includes("application/json");
  try {
    const trainings = await Training.find().sort({ createdAt: -1 });
    const employees = await Employee.find({ status: "Active" });

    if (isJson) {
      return res.json({ success: true, trainings, employees });
    }

    res.render("training/manage", { trainings, employees, success: req.query.success || "", error: req.query.error || "" });
  } catch (err) {
    console.error("HR Training Manage Error:", err);
    if (isJson) return res.status(500).json({ error: "Error loading management portal" });
    res.status(500).send("Error loading management portal");
  }
});

// POST: Create Training Module (HR)
router.post("/create", async (req, res) => {
  const isJson = req.query.format === "json" || req.headers.accept?.includes("application/json") || req.body.format === "json";
  try {
    const { title, description, category, targetDepartment, contentType, contentUrl, durationMinutes } = req.body;

    if (!title || !description || !contentUrl) {
      if (isJson) return res.status(400).json({ error: "Title, Description, and Content URL are required" });
      return res.redirect("/training/manage?error=Missing+required+fields");
    }

    // Auto-assign to employees in target department (or ALL)
    let empQuery = { status: "Active" };
    if (targetDepartment && targetDepartment !== "ALL") {
      empQuery.department = targetDepartment;
    }
    const targetEmps = await Employee.find(empQuery);

    const initialAssignments = targetEmps.map(emp => ({
      employeeId: emp._id,
      status: "Pending"
    }));

    const newTraining = await Training.create({
      title,
      description,
      category: category || "Technical",
      targetDepartment: targetDepartment || "ALL",
      contentType: contentType || "Document",
      contentUrl,
      durationMinutes: Number(durationMinutes) || 30,
      assignedEmployees: initialAssignments
    });

    if (isJson) {
      return res.json({ success: true, message: "Training module created successfully", training: newTraining });
    }
    res.redirect("/training/manage?success=New+training+module+created+and+assigned+successfully");
  } catch (err) {
    console.error("Create Training Error:", err);
    if (isJson) return res.status(500).json({ error: "Error creating training module" });
    res.redirect("/training/manage?error=" + encodeURIComponent(err.message));
  }
});

module.exports = router;
