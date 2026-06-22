import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import Card from '../components/Card';
import Button from '../components/Button';
import Header from '../components/Header';
import { getHRUserProfile, updateHRUserComplianceStatus, reviewHRUserDocument } from '../api';
import { API_BASE_URL } from '../config';
import { FontAwesome5 } from '@expo/vector-icons';

export default function HRManageUserProfileScreen({ routeParams, onBack, user: currentUser }) {
  const userId = routeParams?.userId;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingDoc, setUpdatingDoc] = useState(null); // stores docId being processed
  const [selectedStatus, setSelectedStatus] = useState('OPEN');

  const loadProfile = async () => {
    if (!userId) {
      Alert.alert('Error', 'No user identifier provided.');
      onBack();
      return;
    }
    try {
      const response = await getHRUserProfile(userId);
      setData(response);
      setSelectedStatus(response.status || 'OPEN');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to retrieve compliance profile folder.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadProfile();
  };

  const handleUpdateOverallStatus = async (statusVal) => {
    setUpdatingStatus(true);
    try {
      await updateHRUserComplianceStatus(userId, statusVal);
      Alert.alert('Success', `Overall compliance status updated to ${statusVal}.`);
      loadProfile();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to update overall compliance status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDocumentAction = async (docId, action) => {
    setUpdatingDoc(docId);
    try {
      await reviewHRUserDocument(userId, docId, action);
      Alert.alert('Success', `Document successfully ${action === 'approve' ? 'approved' : 'rejected'}.`);
      loadProfile();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to review document.');
    } finally {
      setUpdatingDoc(null);
    }
  };

  const handleDownload = (docId) => {
    const url = `${API_BASE_URL}/documents/download/${docId}`;
    Linking.openURL(url).catch((err) => {
      console.error(err);
      Alert.alert('Error', 'Could not open download link.');
    });
  };

  if (loading && !data) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Retrieving verification files...</Text>
      </View>
    );
  }

  const user = data?.user || {};
  const employee = data?.employee;
  const documents = data?.documents || [];
  const overallStatus = data?.status || 'OPEN';

  const formattedJoiningDate = employee?.joiningDate
    ? new Date(employee.joiningDate).toLocaleDateString('en-GB')
    : 'Pending';

  return (
    <View style={styles.container}>
      <Header
        title={`Profile: ${user.username || ''}`}
        subtitle="Review employee credentials and verify profiles"
        onBack={onBack}
        role={currentUser.role}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Overall Status Badge Banner */}
        <View style={styles.bannerRow}>
          <Text style={styles.reviewLabel}>ADMINISTRATIVE REVIEW</Text>
          <View style={[
            styles.overallStatusBadge,
            overallStatus === 'CLOSED' ? styles.bgDarkBadge : styles.bgPrimaryBadge
          ]}>
            <Text style={styles.overallStatusText}>
              FILE STATUS: {overallStatus}
            </Text>
          </View>
        </View>

        {/* Employee Info Card */}
        <Card style={styles.infoCard}>
          <Text style={styles.cardHeader}>Employee Information</Text>

          <Text style={styles.infoLabel}>Full Name</Text>
          <Text style={styles.infoValue}>
            {employee ? `${employee.firstName} ${employee.lastName || ''}` : 'Not Provided'}
          </Text>

          <Text style={styles.infoLabel}>Department & Role</Text>
          <Text style={styles.infoValue}>
            {employee ? `${employee.department} • ${employee.designation}` : 'N/A'}
          </Text>

          <Text style={styles.infoLabel}>Corporate Email</Text>
          <Text style={[styles.infoValue, styles.textBlue]}>
            {employee ? employee.email : 'N/A'}
          </Text>

          <Text style={styles.infoLabel}>Joining Date</Text>
          <Text style={styles.infoValue}>{formattedJoiningDate}</Text>
        </Card>

        {/* Document Verification Card */}
        <Card style={styles.docsCard}>
          <Text style={styles.cardHeader}>Document Verification</Text>

          {documents.length === 0 ? (
            <Text style={styles.noDocsText}>No compliance documents uploaded yet.</Text>
          ) : (
            documents.map((doc) => {
              const docStatus = doc.status || 'PENDING';
              return (
                <View key={doc._id} style={styles.docItem}>
                  <View style={styles.docDetailsRow}>
                    <View style={styles.docNameCol}>
                      <Text style={styles.docName}>{doc.name}</Text>
                      <Text style={styles.docType}>{(doc.fileType || 'file').toUpperCase()}</Text>
                      <Text style={styles.docDate}>
                        Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                      </Text>
                    </View>

                    <View style={styles.statusCol}>
                      <View style={[
                        styles.statusPill,
                        docStatus === 'APPROVED' ? styles.pillApproved :
                        docStatus === 'REJECTED' ? styles.pillRejected : styles.pillPending
                      ]}>
                        <Text style={[
                          styles.statusPillText,
                          docStatus === 'APPROVED' ? styles.textApproved :
                          docStatus === 'REJECTED' ? styles.textRejected : styles.textPending
                        ]}>
                          {docStatus}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.docActionsRow}>
                    <TouchableOpacity
                      onPress={() => handleDownload(doc._id)}
                      style={styles.btnDownload}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <FontAwesome5 name="download" size={10} color="#222222" style={{ marginRight: 4 }} />
                        <Text style={styles.btnDownloadText}>Download</Text>
                      </View>
                    </TouchableOpacity>

                    {docStatus === 'PENDING' && (
                      <View style={styles.decisionRow}>
                        <TouchableOpacity
                          onPress={() => handleDocumentAction(doc._id, 'reject')}
                          disabled={updatingDoc === doc._id}
                          style={[styles.btnDecision, styles.btnReject]}
                          activeOpacity={0.7}
                        >
                          {updatingDoc === doc._id ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                          ) : (
                            <Text style={styles.btnDecisionText}>Reject</Text>
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleDocumentAction(doc._id, 'approve')}
                          disabled={updatingDoc === doc._id}
                          style={[styles.btnDecision, styles.btnApprove]}
                          activeOpacity={0.7}
                        >
                          {updatingDoc === doc._id ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                          ) : (
                            <Text style={styles.btnDecisionText}>Approve</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </Card>

        {/* Update File Status Card */}
        <Card style={styles.statusControlCard}>
          <Text style={styles.cardHeader}>Update File Status</Text>

          <View style={styles.pickerRow}>
            <TouchableOpacity
              onPress={() => setSelectedStatus('OPEN')}
              style={[
                styles.statusSelectOption,
                selectedStatus === 'OPEN' && styles.statusSelectOptionActive
              ]}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.statusSelectText,
                selectedStatus === 'OPEN' && styles.statusSelectTextActive
              ]}>
                OPEN (Needs Action)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSelectedStatus('CLOSED')}
              style={[
                styles.statusSelectOption,
                selectedStatus === 'CLOSED' && styles.statusSelectOptionActive
              ]}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.statusSelectText,
                selectedStatus === 'CLOSED' && styles.statusSelectTextActive
              ]}>
                CLOSED (Verified)
              </Text>
            </TouchableOpacity>
          </View>

          <Button
            title="Update File Status"
            onPress={() => handleUpdateOverallStatus(selectedStatus)}
            loading={updatingStatus}
            style={styles.btnUpdateStatus}
          />
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  loadingContainer: { flex: 1, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 16, color: '#F8FAFC', fontWeight: '600', marginTop: 12 },
  scrollContent: { padding: 20, paddingBottom: 60 },
  bannerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  reviewLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', letterSpacing: 0.5 },
  overallStatusBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  bgPrimaryBadge: { backgroundColor: '#3B82F6' },
  bgDarkBadge: { backgroundColor: '#0F172A' },
  overallStatusText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  infoCard: { padding: 24, borderRadius: 16, backgroundColor: '#FFFFFF', marginBottom: 20 },
  cardHeader: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 16 },
  infoLabel: { fontSize: 11, fontWeight: '600', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 },
  infoValue: { fontSize: 15, fontWeight: '500', color: '#1E293B', marginBottom: 16 },
  textBlue: { color: '#3B82F6' },
  docsCard: { padding: 20, borderRadius: 16, backgroundColor: '#FFFFFF', marginBottom: 20 },
  noDocsText: { fontSize: 14, color: '#94A3B8', textAlign: 'center', paddingVertical: 30 },
  docItem: { borderBottomWidth: 1, borderColor: '#F1F5F9', paddingVertical: 16 },
  docDetailsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  docName: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  docType: { fontSize: 11, color: '#64748B', marginTop: 2 },
  docDate: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusPillText: { fontSize: 10, fontWeight: '700' },
  pillApproved: { backgroundColor: '#DCFCE7' },
  pillRejected: { backgroundColor: '#FEE2E2' },
  pillPending: { backgroundColor: '#FEF3C7' },
  textApproved: { color: '#166534' },
  textRejected: { color: '#991B1B' },
  textPending: { color: '#92400E' },
  docActionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  btnDownload: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#F1F5F9', borderRadius: 8 },
  btnDownloadText: { fontSize: 12, fontWeight: '600', color: '#1E293B' },
  decisionRow: { flexDirection: 'row', gap: 10 },
  btnDecision: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  btnReject: { backgroundColor: '#EF4444' },
  btnApprove: { backgroundColor: '#10B981' },
  btnDecisionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  statusControlCard: { padding: 24, borderRadius: 16, backgroundColor: '#FFFFFF' },
  pickerRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statusSelectOption: { flex: 1, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
  statusSelectOptionActive: { borderColor: '#3B82F6', backgroundColor: '#EFF6FF' },
  statusSelectText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  statusSelectTextActive: { color: '#3B82F6' },
  btnUpdateStatus: { backgroundColor: '#3B82F6', paddingVertical: 16, borderRadius: 12 }
});
