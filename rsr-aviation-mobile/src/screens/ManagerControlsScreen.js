import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, RefreshControl, TouchableOpacity, Modal } from 'react-native';
import Card from '../components/Card';
import Button from '../components/Button';
import Header from '../components/Header';
import { getDepartmentDashboard, allotTask, allotWFH, postDepartmentAnnouncement, reviewDepartmentLeave, reviewDepartmentResignation } from '../api';

export default function ManagerControlsScreen({ onBack, user }) {
  const department = user.department || 'Operations';
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Task Allotment States
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskType, setTaskType] = useState('Work');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');

  // WFH Allotment States
  const [wfhEmployee, setWfhEmployee] = useState('');
  const [wfhStart, setWfhStart] = useState('');
  const [wfhEnd, setWfhEnd] = useState('');
  const [wfhReason, setWfhReason] = useState('');

  // Announcement States
  const [annTitle, setAnnTitle] = useState('');
  const [annMsg, setAnnMsg] = useState('');

  // Leave Rejection Modal State
  const [rejectLeaveId, setRejectLeaveId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  const loadData = async () => {
    try {
      const response = await getDepartmentDashboard(department);
      setData(response);
    } catch (e) {
      console.error(e);
      Alert.alert('Load Failed', 'Failed to retrieve manager controls database.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleAllotTask = async () => {
    if (!taskTitle.trim() || !taskAssignee || !taskDueDate.trim()) {
      Alert.alert('Validation Error', 'Title, Crew Member, and Due Date are required.');
      return;
    }

    setSubmitLoading(true);
    try {
      await allotTask(department, {
        title: taskTitle.trim(),
        description: taskDesc.trim(),
        type: taskType,
        assignedTo: taskAssignee,
        dueDate: taskDueDate.trim()
      });
      Alert.alert('Success', 'Mission successfully deployed to crew member.');
      setTaskTitle('');
      setTaskDesc('');
      setTaskAssignee('');
      setTaskDueDate('');
      loadData();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to allot task.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleAllotWFH = async () => {
    if (!wfhEmployee || !wfhStart.trim() || !wfhEnd.trim() || !wfhReason.trim()) {
      Alert.alert('Validation Error', 'Please complete all Work From Home schedule fields.');
      return;
    }

    setSubmitLoading(true);
    try {
      await allotWFH(department, {
        employeeId: wfhEmployee,
        startDate: wfhStart.trim(),
        endDate: wfhEnd.trim(),
        reason: wfhReason.trim()
      });
      Alert.alert('Success', 'Work From Home schedule has been allotted.');
      setWfhEmployee('');
      setWfhStart('');
      setWfhEnd('');
      setWfhReason('');
      loadData();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to allot remote schedule.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handlePostAnnouncement = async () => {
    if (!annTitle.trim() || !annMsg.trim()) {
      Alert.alert('Validation Error', 'Topic title and Message text are required.');
      return;
    }

    setSubmitLoading(true);
    try {
      await postDepartmentAnnouncement(department, annTitle.trim(), annMsg.trim());
      Alert.alert('Success', 'Announcement posted to the department board.');
      setAnnTitle('');
      setAnnMsg('');
      loadData();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to post announcement.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleLeaveAction = async (leaveId, action) => {
    if (action === 'reject') {
      setRejectLeaveId(leaveId);
      return;
    }

    setSubmitLoading(true);
    try {
      await reviewDepartmentLeave(department, leaveId, 'approve');
      Alert.alert('Approved', 'Leave request has been approved.');
      loadData();
    } catch (e) {
      Alert.alert('Error', e.message || 'Error processing request.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const submitRejection = async () => {
    if (!rejectionReason.trim()) {
      Alert.alert('Validation Error', 'Please enter a rejection reason.');
      return;
    }

    setRejectLoading(true);
    try {
      await reviewDepartmentLeave(department, rejectLeaveId, 'reject', rejectionReason.trim());
      Alert.alert('Rejected', 'Leave request has been declined.');
      setRejectLeaveId(null);
      setRejectionReason('');
      loadData();
    } catch (e) {
      Alert.alert('Error', e.message || 'Error processing request.');
    } finally {
      setRejectLoading(false);
    }
  };

  const handleResignationAction = async (employeeId, action) => {
    const actionLabel = action === 'approve' ? 'Accept' : 'Decline';
    Alert.alert(
      `${actionLabel} Resignation`,
      `Are you sure you want to ${action.toLowerCase()} this resignation request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionLabel,
          style: action === 'approve' ? 'destructive' : 'default',
          onPress: async () => {
            setSubmitLoading(true);
            try {
              await reviewDepartmentResignation(department, employeeId, action);
              Alert.alert('Processed', `Resignation has been ${action}d.`);
              loadData();
            } catch (e) {
              Alert.alert('Error', e.message || 'Error processing request.');
            } finally {
              setSubmitLoading(false);
            }
          }
        }
      ]
    );
  };

  if (loading && !data) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Syncing Manager Panel Database...</Text>
      </View>
    );
  }

  const employees = data?.employees || [];
  const staffMembers = employees.filter(e => e.designation === 'STAFF' || e.designation === 'Staff');
  const leaves = data?.leaves || [];
  
  // Filter pending leaves (only ones submitted by department staff)
  const pendingLeaves = leaves.filter(l => l.status === 'Pending' || l.status === 'PENDING');
  
  // Filter pending resignations (from department crew)
  const pendingResignations = employees.filter(e => e.resignationStatus === 'Pending');

  return (
    <View style={styles.container}>
      <Header
        title="Manager controls"
        subtitle="Department HOD Operation Room Dashboard"
        onBack={onBack}
        role={user.role}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Pending Leave Requests */}
        <Text style={styles.sectionTitle}>Pending Crew Leaves ({pendingLeaves.length})</Text>
        {pendingLeaves.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>No pending leave requests found.</Text>
          </Card>
        ) : (
          pendingLeaves.map((leave) => {
            const leaveEmp = employees.find(e => e._id === leave.employeeId);
            return (
              <Card key={leave._id} style={styles.leaveCard}>
                <Text style={styles.leaveName}>
                  {leaveEmp ? `${leaveEmp.firstName} ${leaveEmp.lastName}` : 'Unknown Personnel'}
                </Text>
                <Text style={styles.leaveDates}>
                  {leave.leaveType} • {new Date(leave.fromDate).toLocaleDateString()} to {new Date(leave.toDate).toLocaleDateString()}
                </Text>
                <Text style={styles.leaveDays}>Total Days: {leave.totalDays} Day(s)</Text>
                <Text style={styles.leaveReason}>Reason: "{leave.reason}"</Text>

                <View style={styles.btnRow}>
                  <Button
                    title="Decline"
                    type="danger"
                    loading={submitLoading}
                    onPress={() => handleLeaveAction(leave._id, 'reject')}
                    style={styles.halfBtn}
                  />
                  <Button
                    title="Approve"
                    type="success"
                    loading={submitLoading}
                    onPress={() => handleLeaveAction(leave._id, 'approve')}
                    style={styles.halfBtn}
                  />
                </View>
              </Card>
            );
          })
        )}

        {/* Pending Resignations */}
        <Text style={styles.sectionTitle}>Pending Resignations ({pendingResignations.length})</Text>
        {pendingResignations.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>No pending resignation requests.</Text>
          </Card>
        ) : (
          pendingResignations.map((emp) => (
            <Card key={emp._id} style={styles.leaveCard}>
              <Text style={styles.leaveName}>{emp.firstName} {emp.lastName}</Text>
              <Text style={styles.leaveDates}>
                Applied: {emp.resignationDate ? new Date(emp.resignationDate).toLocaleDateString() : 'Today'}
              </Text>
              <Text style={styles.leaveReason}>Reason: "{emp.resignationReason || 'Not stated'}"</Text>

              <View style={styles.btnRow}>
                <Button
                  title="Reject"
                  type="secondary"
                  loading={submitLoading}
                  onPress={() => handleResignationAction(emp._id, 'reject')}
                  style={styles.halfBtn}
                />
                <Button
                  title="Accept"
                  type="danger"
                  loading={submitLoading}
                  onPress={() => handleResignationAction(emp._id, 'approve')}
                  style={styles.halfBtn}
                />
              </View>
            </Card>
          ))
        )}

        {/* Deploy Mission Form */}
        <Text style={styles.sectionTitle}>Deploy Mission / task</Text>
        <Card>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Mission Title</Text>
            <TextInput
              style={styles.input}
              value={taskTitle}
              onChangeText={setTaskTitle}
              placeholder="e.g. Engine Maintenance Audit"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Task Description</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={taskDesc}
              onChangeText={setTaskDesc}
              placeholder="Provide technical specifications..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Mission Type</Text>
            <View style={styles.selectorRow}>
              <TouchableOpacity
                style={[styles.selectorBtn, taskType === 'Work' && styles.selectorActive]}
                onPress={() => setTaskType('Work')}
              >
                <Text style={[styles.selectorText, taskType === 'Work' && styles.selectorTextActive]}>
                  Standard Work
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.selectorBtn, taskType === 'Training' && styles.selectorActive]}
                onPress={() => setTaskType('Training')}
              >
                <Text style={[styles.selectorText, taskType === 'Training' && styles.selectorTextActive]}>
                  Training Cert
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Assign to Crew Member</Text>
            {staffMembers.length === 0 ? (
              <Text style={styles.dropdownPlaceholder}>No staff crew registered in this department.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.crewPicker}>
                {staffMembers.map((staff) => (
                  <TouchableOpacity
                    key={staff._id}
                    style={[styles.crewBtn, taskAssignee === staff._id && styles.crewBtnActive]}
                    onPress={() => setTaskAssignee(staff._id)}
                  >
                    <Text style={[styles.crewText, taskAssignee === staff._id && styles.crewTextActive]}>
                      {staff.firstName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Due Date</Text>
            <TextInput
              style={styles.input}
              value={taskDueDate}
              onChangeText={setTaskDueDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <Button
            title="Deploy Mission"
            type="primary"
            loading={submitLoading}
            onPress={handleAllotTask}
          />
        </Card>

        {/* Allot WFH Form */}
        <Text style={styles.sectionTitle}>Allot Work From Home</Text>
        <Card>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Select Crew Member</Text>
            {employees.length === 0 ? (
              <Text style={styles.dropdownPlaceholder}>No personnel registered.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.crewPicker}>
                {employees.map((staff) => (
                  <TouchableOpacity
                    key={staff._id}
                    style={[styles.crewBtn, wfhEmployee === staff._id && styles.crewBtnActive]}
                    onPress={() => setWfhEmployee(staff._id)}
                  >
                    <Text style={[styles.crewText, wfhEmployee === staff._id && styles.crewTextActive]}>
                      {staff.firstName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Start Date</Text>
            <TextInput
              style={styles.input}
              value={wfhStart}
              onChangeText={setWfhStart}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>End Date</Text>
            <TextInput
              style={styles.input}
              value={wfhEnd}
              onChangeText={setWfhEnd}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>WFH Justification Reason</Text>
            <TextInput
              style={styles.input}
              value={wfhReason}
              onChangeText={setWfhReason}
              placeholder="Provide reason for remote approval..."
              placeholderTextColor="#94a3b8"
            />
          </View>

          <Button
            title="Authorize WFH Schedule"
            type="primary"
            loading={submitLoading}
            onPress={handleAllotWFH}
          />
        </Card>

        {/* Broadcast Announcement Board */}
        <Text style={styles.sectionTitle}>Broadcast Announcement</Text>
        <Card>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Topic Title</Text>
            <TextInput
              style={styles.input}
              value={annTitle}
              onChangeText={setAnnTitle}
              placeholder="e.g. Schedule Alteration"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Message to Team</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={annMsg}
              onChangeText={setAnnMsg}
              placeholder="Type message details..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
            />
          </View>

          <Button
            title="Post Broadcast"
            type="primary"
            loading={submitLoading}
            onPress={handlePostAnnouncement}
          />
        </Card>

        {/* Rejection Reason Modal */}
        <Modal
          visible={rejectLeaveId !== null}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setRejectLeaveId(null)}
        >
          <View style={styles.modalBg}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Leave Disapproval Reason</Text>
              <TextInput
                style={styles.modalTextarea}
                placeholder="State the reason for leave disapproval..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                value={rejectionReason}
                onChangeText={setRejectionReason}
              />
              <View style={styles.modalBtnRow}>
                <Button
                  title="Cancel"
                  type="secondary"
                  onPress={() => {
                    setRejectLeaveId(null);
                    setRejectionReason('');
                  }}
                  style={styles.modalBtn}
                />
                <Button
                  title="Decline"
                  type="danger"
                  loading={rejectLoading}
                  onPress={submitRejection}
                  style={styles.modalBtn}
                />
              </View>
            </View>
          </View>
        </Modal>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0052cc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 8,
    paddingLeft: 4,
  },
  emptyCard: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  leaveCard: {
    marginVertical: 6,
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  leaveName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  leaveDates: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0052cc',
    marginTop: 2,
  },
  leaveDays: {
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '600',
    marginTop: 4,
  },
  leaveReason: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 12,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  halfBtn: {
    flex: 1,
    marginVertical: 0,
    paddingVertical: 10,
  },
  formGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#ffffff',
    color: '#0f172a',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 13,
    fontSize: 13,
    fontWeight: '600',
  },
  textarea: {
    height: 70,
    textAlignVertical: 'top',
  },
  selectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  selectorBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  selectorActive: {
    borderColor: '#0052cc',
    backgroundColor: '#e8f0fe',
  },
  selectorText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  selectorTextActive: {
    color: '#0052cc',
  },
  crewPicker: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  crewBtn: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginRight: 8,
    backgroundColor: '#ffffff',
  },
  crewBtnActive: {
    borderColor: '#0052cc',
    backgroundColor: '#e8f0fe',
  },
  crewText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  crewTextActive: {
    color: '#0052cc',
  },
  dropdownPlaceholder: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#94a3b8',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 24,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  modalTextarea: {
    backgroundColor: '#ffffff',
    color: '#0f172a',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    fontWeight: '600',
    height: 70,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalBtn: {
    flex: 1,
    marginVertical: 0,
  },
});
