# HRMS Existing Feature Directory

This document lists all active features currently implemented in the codebase, grouped by functional domains.

---

## 🔐 1. Authentication & Security
*   **Tenant-Based Login:** Multi-tenant session login (`/auth/login`) dynamically routing the request to the client's database.
*   **Password Management:** 
    *   Secure password hashing (via `bcryptjs`).
    *   Change password from user dashboard.
    *   Secure forgot-password email flows with expiry tokens.
*   **Access Control:** Middleware boundaries checking session existence (`requireAuth`) and admin privileges (`hrAuth`).

---

## 👥 2. Employee Directory & Profiles
*   **Directory Management:** Searchable directory of all employee profiles (`/hr/users`) with detailed info cards.
*   **Profile Customization:** Employee profile views showing job details, leave history, LOP counts, uploaded documents, and profile picture updates.
*   **Employee Edits:** Profile updating form whitelisting and processing personal changes.

---

## 🕒 3. Attendance, Shifts, & Rosters
*   **Punch Clock:** Punch-in and punch-out mechanics recording exact clock timings.
*   **Shift Configurations:** Define shifts and allocate timings for departments.
*   **Roster Calendars:** Calendar planning tool to allot rosters to personnel.
*   **Regularizations:** Request correction logs for skipped punches or wrong logs, subject to manager/HR approval.

---

## 🌴 4. Leave Management
*   **Leave Requests:** Apply for leave (Sick Leave, Casual Leave, LOP, etc.) specifying dates.
*   **Leave Balance System:** Auto-calculating leave balances and deducting approved days.
*   **Loss of Pay (LOP):** Track unpaid leaves (LOP) to automatically deduct salary during payroll generation.

---

## 💼 5. Performance Management (PMS)
*   **Goal Tracking:** Create corporate/personal goals and monitor progress.
*   **PMS Appraisals:** Run self-assessments and manager appraisal ratings.

---

## 💸 6. Payroll & Payslips
*   **Manual Generation:** HR can generate single-employee payslips for a selected month/year.
*   **Bulk Generation:** Automatically calculate and generate payslips for all active employees:
    *   Auto-deducts PF and Professional Tax based on config.
    *   Calculates 5% income tax if base salary exceeds ₹50,000.
    *   Deducts LOP days from basic salary dynamically.
*   **Download & Print:** Printable EJS layouts for payslips, allowing employees to view and save their records.

---

## ✈️ 7. Travel Desk & Trip Tracking
*   **Trip Planner:** Employees can request official trips (specifying destination coordinates, start/end dates, and purpose).
*   **Live Trip Logs:** Punch start/end locations during trips. Auto-starts daily logs for field work.
*   **HR Map Telemetry:** Shows active employee locations on a dashboard map.

---

## 🧾 8. Expense Claims
*   **Claim Submissions:** Employees can upload receipts (images/PDFs via Multer) and submit reimbursement requests.
*   **HR Approval Workflow:** HR dashboard to review and approve/reject claims. Approved claims automatically add to the monthly payslip reimbursements.

---

## 📄 9. Document Management
*   **Identity Uploads:** Employees upload bank details, government ID cards (PAN, Aadhaar), and passport copies.
*   **HR Document Verification:** Queue for HR to review, approve, or reject documents.
*   **Control Panel:** HR can open/close document upload portals dynamically.

---

## 🛠️ 10. Checklist Pipelines
*   **Onboarding/Offboarding Checklists:** Templates to create lists of mandatory tasks.
*   **Checklist Runs:** Assign checklist checklists to new hires or resigning employees, tracking status checkboxes.

---

## 📢 11. Notice Board & Messaging
*   **Announcements:** Post general corporate notices or department-specific broadcasts.
*   **Personal Alerts:** Contextual notifications for individual updates.

---

## 💳 12. SaaS Registration & Billing
*   **Tenancy Registry:** Create custom tenants (subdomains/slugs) with separate database connections.
*   **Razorpay Billing:** Integrated subscription renewal system which extends tenancy access by 30 days upon successful payment.
