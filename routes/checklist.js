const express = require("express");
const router = express.Router();
const ChecklistTemplate = require("../models/ChecklistTemplate");
const EmployeeChecklist = require("../models/EmployeeChecklist");
const Employee = require("../models/Employee");

// Middleware to protect HR routes
function hrAuth(req, res, next) {
  if (!req.session.userId || req.session.role !== "HR") {
    const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json') || req.body.format === 'json';
    if (isJson) {
      return res.status(401).json({ error: "Unauthorized. HR session required." });
    }
    return res.redirect("/hr/hr-login");
  }
  next();
}

// GET /hr/checklists - Dashboard
router.get("/checklists", hrAuth, async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json');
  try {
    const templates = await ChecklistTemplate.find().sort({ type: 1 });
    const activeRuns = await EmployeeChecklist.find()
      .populate("employeeId")
      .sort({ createdAt: -1 });

    if (isJson) {
      return res.json({ success: true, templates, activeRuns });
    }
    res.render("hr/checklists", { templates, activeRuns });
  } catch (err) {
    console.error(err);
    if (isJson) return res.status(500).json({ error: "Failed to load checklists dashboard" });
    res.status(500).send("Error loading checklists");
  }
});

// POST /hr/checklists/template/task/add - Add task to a template type
router.post("/checklists/template/task/add", hrAuth, async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json') || req.body.format === 'json';
  const { type, taskTitle, assignedRole } = req.body;

  try {
    if (!type || !taskTitle || !assignedRole) {
      if (isJson) return res.status(400).json({ error: "All fields are required" });
      return res.redirect("/hr/checklists?error=missing_fields");
    }

    let template = await ChecklistTemplate.findOne({ type });
    if (!template) {
      template = new ChecklistTemplate({
        name: `${type} Default Checklist`,
        type,
        tasks: []
      });
    }

    template.tasks.push({ taskTitle, assignedRole });
    await template.save();

    if (isJson) {
      return res.json({ success: true, message: "Task added to template", template });
    }
    res.redirect("/hr/checklists");
  } catch (err) {
    console.error(err);
    if (isJson) return res.status(500).json({ error: "Failed to add task to template" });
    res.redirect("/hr/checklists?error=failed_to_add");
  }
});

// POST /hr/checklists/template/task/delete/:templateId/:taskId - Delete task from template
router.post("/checklists/template/task/delete/:templateId/:taskId", hrAuth, async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json') || req.body.format === 'json';
  try {
    const template = await ChecklistTemplate.findById(req.params.templateId);
    if (!template) {
      if (isJson) return res.status(404).json({ error: "Template not found" });
      return res.redirect("/hr/checklists?error=not_found");
    }

    template.tasks = template.tasks.filter(t => t._id.toString() !== req.params.taskId);
    await template.save();

    if (isJson) {
      return res.json({ success: true, message: "Task removed from template", template });
    }
    res.redirect("/hr/checklists");
  } catch (err) {
    console.error(err);
    if (isJson) return res.status(500).json({ error: "Failed to delete task" });
    res.redirect("/hr/checklists?error=failed_to_delete");
  }
});

// POST /hr/checklists/run/:checklistId/task/:taskId/toggle - Toggle status of task in run instance
router.post("/checklists/run/:checklistId/task/:taskId/toggle", hrAuth, async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json') || req.body.format === 'json';
  try {
    const run = await EmployeeChecklist.findById(req.params.checklistId);
    if (!run) {
      if (isJson) return res.status(404).json({ error: "Checklist run instance not found" });
      return res.redirect("/hr/checklists?error=not_found");
    }

    const task = run.tasks.id(req.params.taskId);
    if (!task) {
      if (isJson) return res.status(404).json({ error: "Task not found" });
      return res.redirect("/hr/checklists?error=task_not_found");
    }

    if (task.status === "Pending") {
      task.status = "Completed";
      task.completedAt = new Date();
      task.completedBy = req.session.userId;
    } else {
      task.status = "Pending";
      task.completedAt = null;
      task.completedBy = null;
    }

    await run.save();

    if (isJson) {
      return res.json({ success: true, status: task.status, task });
    }
    res.redirect("/hr/checklists");
  } catch (err) {
    console.error(err);
    if (isJson) return res.status(500).json({ error: "Failed to toggle task status" });
    res.redirect("/hr/checklists?error=failed_to_toggle");
  }
});

module.exports = router;
