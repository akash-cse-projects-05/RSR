import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, RefreshControl, Modal } from 'react-native';
import Card from '../components/Card';
import Button from '../components/Button';
import Header from '../components/Header';
import { getProfile, changePassword, changeHRPassword, resign, revokeResignation } from '../api';

export default function ProfileScreen({ onBack, user }) {
  const isHR = user.role === 'HR';
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Password Modal State
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Resignation Form State
  const [resignReason, setResignReason] = useState('');
  const [resignLoading, setResignLoading] = useState(false);
  const [showResignForm, setShowResignForm] = useState(false);

  const loadData = async () => {
    try {
      if (!isHR) {
        const data = await getProfile();
        setProfileData(data);
      } else {
        // HR mock profile since HR logs in as 'system'
        setProfileData({
          employee: {
            firstName: 'System',
            lastName: 'Administrator',
            employeeCode: 'HR-01',
            department: 'HR',
            designation: 'HR manager',
            email: 'admin@hrms.com',
            mobile: '+1-555-0199',
            joiningDate: '2020-01-01',
          }
        });
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Load Failed', 'Failed to retrieve profile data.');
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

  const handlePasswordUpdate = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Validation Error', 'New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Validation Error', 'New passwords do not match.');
      return;
    }
    if (!isHR && !currentPassword) {
      Alert.alert('Validation Error', 'Please enter your current password.');
      return;
    }

    setPasswordLoading(true);
    try {
      if (isHR) {
        await changeHRPassword(newPassword, confirmPassword);
      } else {
        await changePassword(currentPassword, newPassword, confirmPassword);
      }
      Alert.alert('Success', 'Your password has been updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordModalVisible(false);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to update password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleResign = async () => {
    if (!resignReason.trim()) {
      Alert.alert('Validation Error', 'Please state a reason for resignation.');
      return;
    }

    Alert.alert(
      'Confirm Resignation',
      'Are you sure you want to submit your resignation request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          style: 'destructive',
          onPress: async () => {
            setResignLoading(true);
            try {
              await resign(resignReason.trim());
              Alert.alert('Submitted', 'Your resignation request has been processed.');
              setResignReason('');
              setShowResignForm(false);
              loadData();
            } catch (e) {
              Alert.alert('Error', e.message || 'Failed to process resignation.');
            } finally {
              setResignLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleRevoke = async () => {
    Alert.alert(
      'Revoke Resignation',
      'Are you sure you want to cancel your resignation request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Revoke',
          onPress: async () => {
            setResignLoading(true);
            try {
              await revokeResignation();
              Alert.alert('Revoked', 'Your resignation request has been successfully cancelled.');
              loadData();
            } catch (e) {
              Alert.alert('Error', e.message || 'Failed to cancel resignation.');
            } finally {
              setResignLoading(false);
            }
          }
        }
      ]
    );
  };

  if (loading && !profileData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading Profile...</Text>
      </View>
    );
  }

  const emp = profileData?.employee || {};
  const isResignationPending = emp.resignationStatus === 'Pending';
  const isResignationApproved = emp.resignationStatus === 'Approved';

  return (
    <View style={styles.container}>
      <Header
        title="My Profile"
        subtitle={isHR ? 'HR Administration Settings' : 'Personal dossier and security center'}
        onBack={onBack}
        role={user.role}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* User Card */}
        <Card style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarLetter}>
              {emp.firstName ? emp.firstName.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
          <Text style={styles.userName}>{emp.firstName} {emp.lastName}</Text>
          <Text style={styles.userCode}>{emp.employeeCode} • {emp.designation}</Text>
        </Card>

        {/* Dossier Details */}
        <Text style={styles.sectionTitle}>Employee Credentials</Text>
        <Card style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Department</Text>
            <Text style={styles.detailVal}>{emp.department || '-'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Email Address</Text>
            <Text style={styles.detailVal}>{emp.email || '-'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Mobile Number</Text>
            <Text style={styles.detailVal}>{emp.mobile || '-'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Joining Date</Text>
            <Text style={styles.detailVal}>{emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : '-'}</Text>
          </View>
          {!isHR && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Leave Balance</Text>
              <Text style={[styles.detailVal, styles.highlightVal]}>{emp.leaveBalance || 0} Days</Text>
            </View>
          )}
        </Card>

        {/* WFH Schedule */}
        {!isHR && emp.wfhSchedule && emp.wfhSchedule.startDate && (
          <>
            <Text style={styles.sectionTitle}>Work From Home Schedule</Text>
            <Card style={styles.wfhCard} accentColor="#e6f0ff">
              <Text style={styles.wfhTitle}>Allotted Remote Schedule</Text>
              <Text style={styles.wfhDates}>
                {new Date(emp.wfhSchedule.startDate).toLocaleDateString()} to {new Date(emp.wfhSchedule.endDate).toLocaleDateString()}
              </Text>
              <Text style={styles.wfhReason}>Reason: "{emp.wfhSchedule.reason}"</Text>
            </Card>
          </>
        )}

        {/* Security Controls */}
        <Text style={styles.sectionTitle}>Security Settings</Text>
        <Card>
          <Button
            title="🔒 Change Account Password"
            type="primary"
            onPress={() => setPasswordModalVisible(true)}
          />
        </Card>

        {/* Resignation Panel (Employee Only) */}
        {!isHR && (
          <>
            <Text style={styles.sectionTitle}>Resignation Portal</Text>
            <Card style={styles.resignCard}>
              {isResignationPending ? (
                <View style={styles.statusBox}>
                  <Text style={styles.resignStatusText}>⚠️ Resignation Request Pending</Text>
                  <Text style={styles.resignDateText}>
                    Submitted: {new Date(emp.resignationDate).toLocaleDateString()}
                  </Text>
                  <Text style={styles.resignReasonText}>Reason: "{emp.resignationReason}"</Text>
                  <Button
                    title="Revoke Resignation Request"
                    type="danger"
                    loading={resignLoading}
                    onPress={handleRevoke}
                    style={styles.resignBtn}
                  />
                </View>
              ) : isResignationApproved ? (
                <View style={styles.statusBox}>
                  <Text style={[styles.resignStatusText, styles.greenText]}>✓ Resignation Accepted</Text>
                  <Text style={styles.resignSubText}>HR will coordinate exit clearances.</Text>
                </View>
              ) : showResignForm ? (
                <View style={styles.formBox}>
                  <Text style={styles.formTitle}>Submit Resignation Dossier</Text>
                  <TextInput
                    style={styles.textarea}
                    placeholder="Provide your official reason for resignation..."
                    placeholderTextColor="#94a3b8"
                    multiline
                    numberOfLines={4}
                    value={resignReason}
                    onChangeText={setResignReason}
                  />
                  <View style={styles.btnRow}>
                    <Button
                      title="Cancel"
                      type="secondary"
                      onPress={() => setShowResignForm(false)}
                      style={styles.halfBtn}
                    />
                    <Button
                      title="Submit"
                      type="danger"
                      loading={resignLoading}
                      onPress={handleResign}
                      style={styles.halfBtn}
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.statusBox}>
                  <Text style={styles.resignSubText}>Apply for voluntary exit from HRMS.</Text>
                  <Button
                    title="Apply for Resignation"
                    type="danger"
                    onPress={() => setShowResignForm(true)}
                    style={styles.resignBtn}
                  />
                </View>
              )}
            </Card>
          </>
        )}

        {/* Password Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={passwordModalVisible}
          onRequestClose={() => setPasswordModalVisible(false)}
        >
          <View style={styles.modalBg}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Change Account Password</Text>

              {!isHR && (
                <View style={styles.modalGroup}>
                  <Text style={styles.modalLabel}>Current Password</Text>
                  <TextInput
                    style={styles.modalInput}
                    secureTextEntry
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="Enter current password"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              )}

              <View style={styles.modalGroup}>
                <Text style={styles.modalLabel}>New Password</Text>
                <TextInput
                  style={styles.modalInput}
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Minimum 6 characters"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.modalGroup}>
                <Text style={styles.modalLabel}>Confirm New Password</Text>
                <TextInput
                  style={styles.modalInput}
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Retype new password"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.modalBtnRow}>
                <Button
                  title="Cancel"
                  type="secondary"
                  onPress={() => {
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordModalVisible(false);
                  }}
                  style={styles.modalBtn}
                />
                <Button
                  title="Update"
                  type="primary"
                  loading={passwordLoading}
                  onPress={handlePasswordUpdate}
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
  profileCard: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 16,
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
  avatarCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#e6f0ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#0052cc',
  },
  avatarLetter: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0052cc',
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  userCode: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 4,
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
  detailsCard: {
    paddingVertical: 8,
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
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  detailVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  highlightVal: {
    color: '#0052cc',
    fontWeight: '800',
  },
  wfhCard: {
    marginVertical: 4,
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
  wfhTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  wfhDates: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0052cc',
  },
  wfhReason: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 6,
    fontStyle: 'italic',
  },
  resignCard: {
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
  statusBox: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  resignStatusText: {
    color: '#dc3545',
    fontWeight: '800',
    fontSize: 14,
    marginBottom: 4,
  },
  greenText: {
    color: '#28a745',
  },
  resignDateText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  resignReasonText: {
    color: '#0f172a',
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 12,
    textAlign: 'center',
  },
  resignBtn: {
    width: '100%',
    marginVertical: 4,
  },
  resignSubText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  formBox: {
    width: '100%',
  },
  formTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  textarea: {
    backgroundColor: '#ffffff',
    color: '#0f172a',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    fontWeight: '600',
    textAlignVertical: 'top',
    height: 90,
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
    borderRadius: 16,
    padding: 24,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 16,
  },
  modalGroup: {
    marginBottom: 14,
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  modalInput: {
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
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 10,
  },
  modalBtn: {
    flex: 1,
    marginVertical: 0,
  },
});
