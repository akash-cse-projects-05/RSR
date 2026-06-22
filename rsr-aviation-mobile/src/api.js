import { API_BASE_URL } from './config';
import { Platform } from 'react-native';

let sessionCookie = '';

// Helper to clear session cookie on logout
export function clearSessionCookie() {
  sessionCookie = '';
}

// Unified fetch wrapper that automatically parses and handles the Express session cookie
async function request(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  if (sessionCookie) {
    headers['Cookie'] = sessionCookie;
  }

  const fetchOptions = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, fetchOptions);
    
    // Extract set-cookie header if present to maintain session persistence
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      const cookieMatch = setCookie.match(/connect\.sid=[^;]+/);
      if (cookieMatch) {
        sessionCookie = cookieMatch[0];
      }
    }

    const contentType = response.headers.get('content-type');
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = { text: await response.text() };
    }

    if (!response.ok) {
      const snippet = data.text ? data.text.substring(0, 100) : '';
      const errMsg = data.error || data.error_msg || `API Request failed with status ${response.status} ${snippet}`;
      throw new Error(errMsg);
    }
    return data;
  } catch (error) {
    console.error(`API Client Error [${path}]:`, error);
    throw error;
  }
}

/* ==========================================================================
   AUTHENTICATION
   ========================================================================== */
export async function login(username, password, isHR = false) {
  const endpoint = isHR ? '/hr/hr-login' : '/auth/login';
  const data = await request(endpoint, {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  return data;
}

export async function logout() {
  try {
    await request('/logout');
  } catch (e) {
    // Ignore error if session already expired
  }
  clearSessionCookie();
}

/* ==========================================================================
   DASHBOARDS
   ========================================================================== */
export async function getEmployeeDashboard() {
  return await request('/dashboard?format=json');
}

export async function getHRDashboard() {
  return await request('/hr/dashboard?format=json');
}

/* ==========================================================================
   ATTENDANCE
   ========================================================================== */
export async function punchIn(lat, lng, address) {
  return await request('/attendance/punch-in', {
    method: 'POST',
    body: JSON.stringify({ lat, lng, address })
  });
}

export async function punchOut(lat, lng, address) {
  return await request('/attendance/punch-out', {
    method: 'POST',
    body: JSON.stringify({ lat, lng, address })
  });
}

/* ==========================================================================
   LEAVES
   ========================================================================== */
export async function getLeaves(isHR = false) {
  const endpoint = isHR ? '/hr/leaves?format=json' : '/leave/my-leaves?format=json';
  return await request(endpoint);
}

export async function applyLeave(leaveData) {
  return await request('/leave/apply', {
    method: 'POST',
    body: JSON.stringify(leaveData)
  });
}

export async function leaveAction(id, actionData) {
  // actionData: { status, hrRemark, rejectionReason }
  return await request(`/hr/leave-action/${id}`, {
    method: 'POST',
    body: JSON.stringify(actionData)
  });
}

/* ==========================================================================
   EXPENSES
   ========================================================================== */
export async function getExpenses(isHR = false) {
  const endpoint = isHR ? '/expense/hr/dashboard?format=json' : '/expense/my-expenses?format=json';
  return await request(endpoint);
}

export async function applyExpense(expenseData) {
  return await request('/expense/apply', {
    method: 'POST',
    body: JSON.stringify(expenseData)
  });
}

export async function expenseAction(id, status, reason) {
  return await request(`/expense/hr/action/${id}`, {
    method: 'POST',
    body: JSON.stringify({ status, reason })
  });
}

export async function checkIn(lat, lng, address) {
  return await request('/expense/check-in', {
    method: 'POST',
    body: JSON.stringify({ lat, lng, address })
  });
}

/* ==========================================================================
   TRIPS
   ========================================================================== */
export async function getTrips(isHR = false) {
  const endpoint = isHR ? '/trip/hr/dashboard?format=json' : '/trip/my-trips?format=json';
  return await request(endpoint);
}

export async function requestTrip(tripData) {
  return await request('/trip/request', {
    method: 'POST',
    body: JSON.stringify(tripData)
  });
}

export async function startTrip(id, lat, lng) {
  return await request(`/trip/start/${id}`, {
    method: 'POST',
    body: JSON.stringify({ lat, lng })
  });
}

export async function endTrip(id) {
  return await request(`/trip/end/${id}`, {
    method: 'POST'
  });
}

export async function startTripDay(id, lat, lng, address) {
  return await request(`/trip/start-day/${id}`, {
    method: 'POST',
    body: JSON.stringify({ lat, lng, address })
  });
}

export async function endTripDay(id, lat, lng, address, tasksDone) {
  return await request(`/trip/end-day/${id}`, {
    method: 'POST',
    body: JSON.stringify({ lat, lng, address, tasksDone })
  });
}

export async function logTripActivity(id, lat, lng, note, address) {
  return await request(`/trip/log-activity/${id}`, {
    method: 'POST',
    body: JSON.stringify({ lat, lng, note, address })
  });
}

export async function updateTripLog(tripId, logId, tasksDone) {
  return await request(`/trip/update-log/${tripId}`, {
    method: 'POST',
    body: JSON.stringify({ logId, tasksDone })
  });
}

/* ==========================================================================
   NOTICE BOARD
   ========================================================================== */
export async function getNotices() {
  return await request('/notice-board?format=json');
}

export async function createNotice(noticeData) {
  // noticeData: { type, title, message }
  return await request('/notice-board/new', {
    method: 'POST',
    body: JSON.stringify(noticeData)
  });
}

/* ==========================================================================
   PAYSLIPS
   ========================================================================== */
export async function getPayslips(isHR = false) {
  const endpoint = isHR ? '/payslip/hr/payslips?format=json' : '/payslip/employee-payslips?format=json';
  return await request(endpoint);
}

export async function getEmployeePayslipsHR(employeeId) {
  return await request(`/payslip/hr/payslips/${employeeId}?format=json`);
}

export async function updateSalaryStructure(employeeId, data) {
  return await request(`/payslip/hr/update-structure/${employeeId}`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function generatePayslipBulk(month, year) {
  return await request('/payslip/bulk-generate', {
    method: 'POST',
    body: JSON.stringify({ month, year })
  });
}

/* ==========================================================================
   REGULARIZATIONS
   ========================================================================== */
export async function getRegularizations(isHR = false) {
  const endpoint = isHR ? '/regularization/hr?format=json' : '/regularization?format=json';
  return await request(endpoint);
}

export async function requestRegularization(date, reason) {
  return await request('/regularization/request', {
    method: 'POST',
    body: JSON.stringify({ date, reason })
  });
}

export async function reviewRegularization(id, status) {
  return await request(`/regularization/review/${id}`, {
    method: 'POST',
    body: JSON.stringify({ status })
  });
}

/* ==========================================================================
   PROFILE & RESIGNATION
   ========================================================================== */
export async function changePassword(currentPassword, newPassword, confirmPassword) {
  return await request('/auth/change-password?format=json', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
  });
}

export async function changeHRPassword(newPassword, confirmPassword) {
  return await request('/hr/change-my-password?format=json', {
    method: 'POST',
    body: JSON.stringify({ newPassword, confirmPassword })
  });
}

export async function getProfile() {
  return await request('/employee/profile?format=json');
}

export async function resign(reason) {
  return await request('/employee/resign?format=json', {
    method: 'POST',
    body: JSON.stringify({ reason })
  });
}

export async function revokeResignation() {
  return await request('/employee/revoke-resignation?format=json', {
    method: 'POST',
    body: JSON.stringify({})
  });
}

/* ==========================================================================
   DOCUMENTS & BANK DETAILS
   ========================================================================== */
export async function getDocuments() {
  return await request('/documents?format=json');
}

export async function updateBankDetails(bankDetails) {
  return await request('/documents/bank-details?format=json', {
    method: 'POST',
    body: JSON.stringify(bankDetails)
  });
}

export async function uploadDocument(name, uri, mimeType) {
  const formData = new FormData();
  formData.append('name', name);

  if (Platform.OS === 'web') {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = uri.split('/').pop() || 'document.pdf';
      formData.append('document', blob, filename);
    } catch (e) {
      console.error('Web file blob extraction failed, using mock file:', e);
      const file = new File(["Mock File Content"], "document.pdf", { type: mimeType || 'application/pdf' });
      formData.append('document', file);
    }
  } else {
    const filename = uri.split('/').pop() || 'document.pdf';
    formData.append('document', {
      uri,
      name: filename,
      type: mimeType || 'application/octet-stream',
    });
  }

  return await request('/documents/upload?format=json', {
    method: 'POST',
    body: formData
  });
}

export async function uploadPhoto(uri, mimeType) {
  const formData = new FormData();

  if (Platform.OS === 'web') {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = uri.split('/').pop() || 'profile.jpg';
      formData.append('profilePhoto', blob, filename);
    } catch (e) {
      console.error('Web photo blob extraction failed, using mock file:', e);
      const file = new File(["Mock Image Content"], "profile.jpg", { type: mimeType || 'image/jpeg' });
      formData.append('profilePhoto', file);
    }
  } else {
    const filename = uri.split('/').pop() || 'profile.jpg';
    formData.append('profilePhoto', {
      uri,
      name: filename,
      type: mimeType || 'image/jpeg',
    });
  }

  return await request('/documents/upload-photo?format=json', {
    method: 'POST',
    body: formData
  });
}

export async function getHRReviewDocuments() {
  return await request('/documents/review?format=json');
}

export async function reviewDocument(docId, action) {
  return await request(`/documents/review/${docId}/${action}?format=json`, {
    method: 'POST'
  });
}

export async function getHRDocumentStatus() {
  return await request('/documents/status?format=json');
}

export async function setHRDocumentStatus(status) {
  return await request('/documents/status?format=json', {
    method: 'POST',
    body: JSON.stringify({ status })
  });
}

/* ==========================================================================
   DEPARTMENT & HOD
   ========================================================================== */
export async function getDepartmentDashboard(department) {
  return await request(`/department/${department}?format=json`);
}

export async function getStaffTasks(department, employeeId) {
  return await request(`/department/${department}/mytasks/${employeeId}?format=json`);
}

export async function getStaffTraining(department, employeeId) {
  return await request(`/department/${department}/training/${employeeId}?format=json`);
}

export async function acknowledgeTask(department, taskId, employeeId) {
  return await request(`/department/${department}/task/${taskId}/acknowledge?format=json`, {
    method: 'POST',
    body: JSON.stringify({ employeeId })
  });
}

export async function completeTask(department, taskId, employeeId, comments) {
  return await request(`/department/${department}/task/${taskId}/complete?format=json`, {
    method: 'POST',
    body: JSON.stringify({ employeeId, comments })
  });
}

export async function updateTrainingProgress(department, taskId, progress) {
  return await request(`/department/${department}/training/${taskId}/progress?format=json`, {
    method: 'POST',
    body: JSON.stringify({ progress })
  });
}

export async function allotTask(department, taskData) {
  return await request(`/department/${department}/task?format=json`, {
    method: 'POST',
    body: JSON.stringify(taskData)
  });
}

export async function allotWFH(department, wfhData) {
  return await request(`/department/${department}/allot-wfh?format=json`, {
    method: 'POST',
    body: JSON.stringify(wfhData)
  });
}

export async function postDepartmentAnnouncement(department, title, message) {
  return await request(`/department/${department}/announcement?format=json`, {
    method: 'POST',
    body: JSON.stringify({ title, message })
  });
}

export async function reviewDepartmentLeave(department, leaveId, action, rejectionReason) {
  return await request(`/department/${department}/leave/${leaveId}?format=json`, {
    method: 'POST',
    body: JSON.stringify({ action, rejectionReason })
  });
}

export async function reviewDepartmentResignation(department, employeeId, action) {
  return await request(`/department/${department}/resignation/${employeeId}?format=json`, {
    method: 'POST',
    body: JSON.stringify({ action })
  });
}

export async function getTodayAttendance() {
  return await request('/attendance?format=json');
}

export async function locationOptionalPunchIn(lat, lng, wfh, reason) {
  return await request('/attendance/location-optional-punch-in', {
    method: 'POST',
    body: JSON.stringify({ lat, lng, wfh, reason })
  });
}

export async function getTripTrack(id) {
  return await request(`/trip/track/${id}?format=json`);
}

/* ==========================================================================
   HR MANAGEMENT EXTENSIONS
   ========================================================================== */
export async function getHRUsers() {
  return await request('/hr/users?format=json');
}

export async function getHRUserProfile(userId) {
  return await request(`/hr/profile/${userId}?format=json`);
}

export async function updateHRUserComplianceStatus(userId, status) {
  return await request(`/hr/profile/${userId}/status?format=json`, {
    method: 'POST',
    body: JSON.stringify({ status })
  });
}

export async function reviewHRUserDocument(userId, docId, action) {
  return await request(`/hr/profile/${userId}/document/${docId}/${action}?format=json`, {
    method: 'POST'
  });
}

export async function toggleHRUserStatus(employeeId) {
  return await request(`/hr/toggle-status/${employeeId}?format=json`, {
    method: 'POST'
  });
}

export async function addHRNewEmployee(employeeData) {
  return await request('/employee/add?format=json', {
    method: 'POST',
    body: JSON.stringify(employeeData)
  });
}

export async function getEmployeeDetails(id) {
  return await request(`/employee/edit/${id}?format=json`);
}

export async function updateEmployeeDetails(id, employeeData) {
  return await request(`/employee/edit/${id}?format=json`, {
    method: 'POST',
    body: JSON.stringify(employeeData)
  });
}
