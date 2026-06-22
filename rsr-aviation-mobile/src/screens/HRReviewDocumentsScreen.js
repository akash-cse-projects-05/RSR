import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, RefreshControl, Switch } from 'react-native';
import Card from '../components/Card';
import Button from '../components/Button';
import Header from '../components/Header';
import { getHRReviewDocuments, reviewDocument, getHRDocumentStatus, setHRDocumentStatus } from '../api';

export default function HRReviewDocumentsScreen({ onBack, user }) {
  const [docsList, setDocsList] = useState([]);
  const [overallStatus, setOverallStatus] = useState('OPEN');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  const loadData = async () => {
    try {
      const docsResponse = await getHRReviewDocuments();
      setDocsList(docsResponse.documents || []);

      const statusResponse = await getHRDocumentStatus();
      setOverallStatus(statusResponse.overallStatus || 'OPEN');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to retrieve HR pending documents folder.');
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

  const handleReviewAction = async (docId, action) => {
    setActionLoading(true);
    try {
      await reviewDocument(docId, action);
      Alert.alert('Success', `Document has been ${action}d successfully.`);
      loadData();
    } catch (e) {
      Alert.alert('Failed', e.message || 'Error processing document action.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (value) => {
    const nextStatus = value ? 'OPEN' : 'CLOSED';
    setStatusLoading(true);
    try {
      await setHRDocumentStatus(nextStatus);
      setOverallStatus(nextStatus);
      Alert.alert('Status Updated', `Document submission window is now ${nextStatus}.`);
    } catch (e) {
      Alert.alert('Failed', e.message || 'Error updating overall submission window.');
    } finally {
      setStatusLoading(false);
    }
  };

  if (loading && docsList.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Connecting to Verification Console...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title="Verification Center"
        subtitle="Review employee credentials and verify profiles"
        onBack={onBack}
        role={user.role}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Toggle Window Status Card */}
        <Text style={styles.sectionTitle}>Submission Window Control</Text>
        <Card style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusCol}>
              <Text style={styles.statusLabel}>Document Submission Portal</Text>
              <Text style={[
                styles.statusValue,
                overallStatus === 'OPEN' ? styles.statusOpen : styles.statusClosed
              ]}>
                {overallStatus === 'OPEN' ? 'OPEN FOR PERSONNEL' : 'LOCKED / CLOSED'}
              </Text>
            </View>
            <Switch
              value={overallStatus === 'OPEN'}
              onValueChange={handleToggleStatus}
              disabled={statusLoading}
              trackColor={{ false: '#ffe3e3', true: '#e6fcf5' }}
              thumbColor={overallStatus === 'OPEN' ? '#28a745' : '#dc3545'}
            />
          </View>
        </Card>

        {/* Pending Reviews List */}
        <Text style={styles.sectionTitle}>Pending Verification Dossiers</Text>
        {docsList.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>No credentials pending verification.</Text>
          </Card>
        ) : (
          docsList.map((doc) => (
            <Card key={doc._id} style={styles.docCard}>
              <View style={styles.docHeader}>
                <Text style={styles.docName}>{doc.name}</Text>
                <View style={styles.badgePending}>
                  <Text style={styles.badgePendingText}>PENDING</Text>
                </View>
              </View>

              <Text style={styles.uploaderText}>
                Uploader: {doc.user?.employeeId?.firstName} {doc.user?.employeeId?.lastName || ''}
              </Text>
              <Text style={styles.uploaderCode}>
                Code: {doc.user?.employeeId?.employeeCode || '-'} • Dept: {doc.user?.employeeId?.department || '-'}
              </Text>

              <Text style={styles.docType}>Type: {doc.fileType}</Text>
              <Text style={styles.docDate}>
                Submitted: {new Date(doc.createdAt).toLocaleDateString()}
              </Text>

              <View style={styles.hrBtnRow}>
                <Button
                  title="Reject"
                  type="danger"
                  loading={actionLoading}
                  onPress={() => handleReviewAction(doc._id, 'reject')}
                  style={styles.actionBtn}
                />
                <Button
                  title="Approve"
                  type="success"
                  loading={actionLoading}
                  onPress={() => handleReviewAction(doc._id, 'approve')}
                  style={styles.actionBtn}
                />
              </View>
            </Card>
          ))
        )}
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
  statusCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusCol: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  statusOpen: {
    color: '#28a745',
  },
  statusClosed: {
    color: '#dc3545',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 30,
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  docCard: {
    marginVertical: 6,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  docHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  docName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
    marginRight: 10,
  },
  badgePending: {
    backgroundColor: '#fff9db',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgePendingText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffc107',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  uploaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  uploaderCode: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
  },
  docType: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 6,
  },
  docDate: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    fontWeight: '600',
  },
  hrBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 12,
    paddingTop: 12,
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginVertical: 0,
  },
});
