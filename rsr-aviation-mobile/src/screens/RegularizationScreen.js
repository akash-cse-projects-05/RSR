import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, RefreshControl, FlatList } from 'react-native';
import Card from '../components/Card';
import Button from '../components/Button';
import Header from '../components/Header';
import { getRegularizations, requestRegularization, reviewRegularization } from '../api';

export default function RegularizationScreen({ onBack, user }) {
  const isHR = user.role === 'HR';
  const [requestsList, setRequestsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form states (Employee)
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  // Action states (HR)
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    try {
      const data = await getRegularizations(isHR);
      setRequestsList(data.requests || []);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to retrieve regularization logs.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRequest = async () => {
    if (!date || !reason.trim()) {
      Alert.alert('Validation Error', 'Effective Date and Reason are required.');
      return;
    }

    setSubmitLoading(true);
    try {
      await requestRegularization(date, reason.trim());
      Alert.alert('Success', 'Regularization request submitted.');
      setDate('');
      setReason('');
      loadData();
    } catch (e) {
      Alert.alert('Submission Failed', e.message || 'Error processing regularization request.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleHRAction = async (id, status) => {
    setActionLoading(true);
    try {
      await reviewRegularization(id, status);
      Alert.alert('Success', `Adjustment request has been ${status.toLowerCase()}d.`);
      loadData();
    } catch (e) {
      Alert.alert('Failed', e.message || 'Error updating request status.');
    } finally {
      setActionLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const renderRequestItem = ({ item }) => {
    const isPending = item.status === 'Pending';
    const isApproved = item.status === 'Approved';
    const isRejected = item.status === 'Rejected';

    return (
      <Card style={styles.itemCard} accentColor={isApproved ? '#e6fcf5' : isRejected ? '#ffe3e3' : '#fff9db'}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemTitle}>Date: {item.date}</Text>
          <View style={[styles.statusBadge, isApproved ? styles.badgeSuccess : isRejected ? styles.badgeDanger : styles.badgeWarning]}>
            <Text style={[styles.badgeText, isApproved ? styles.textSuccess : isRejected ? styles.textDanger : styles.textWarning]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {isHR && (
          <Text style={styles.applicantText}>
            Employee: {item.employeeId?.firstName} {item.employeeId?.lastName || ''} ({item.employeeId?.employeeCode || '-'})
          </Text>
        )}

        <Text style={styles.itemReason}>Reason: {item.reason}</Text>

        {isHR && isPending && (
          <View style={styles.hrBtnRow}>
            <Button
              title="Reject"
              type="danger"
              loading={actionLoading}
              onPress={() => handleHRAction(item._id, 'Rejected')}
              style={styles.actionBtn}
            />
            <Button
              title="Approve"
              type="success"
              loading={actionLoading}
              onPress={() => handleHRAction(item._id, 'Approved')}
              style={styles.actionBtn}
            />
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title={isHR ? 'Regularization Console' : 'Attendance Correction'}
        subtitle={isHR ? 'Review missing log adjustments' : 'Request corrections for missing clock logs'}
        onBack={onBack}
        role={user.role}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Request adjustment form (Employee) */}
        {!isHR && (
          <Card style={styles.formCard}>
            <Text style={styles.sectionTitle}>Request Adjustment</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Effective Date</Text>
              <TextInput
                style={styles.input}
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Reason for Discrepancy</Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={3}
                placeholder="e.g. Card scanner failure, client meeting outside office, etc."
                placeholderTextColor="#94a3b8"
              />
            </View>

            <Button
              title="Submit for Approval"
              onPress={handleRequest}
              loading={submitLoading}
            />
          </Card>
        )}

        {/* Correction Logs List */}
        <Text style={styles.sectionTitle}>{isHR ? 'Pending Review Requests' : 'Adjustment Folder Logs'}</Text>
        {requestsList.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>No regularization requests found.</Text>
          </Card>
        ) : (
          <FlatList
            data={requestsList}
            renderItem={renderRequestItem}
            keyExtractor={(item) => item._id}
            scrollEnabled={false}
          />
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
  formCard: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginVertical: 12,
  },
  formGroup: {
    marginBottom: 16,
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
  multiline: {
    height: 80,
    textAlignVertical: 'top',
  },
  itemCard: {
    marginVertical: 6,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeSuccess: {
    backgroundColor: '#e6fcf5',
  },
  badgeDanger: {
    backgroundColor: '#ffe3e3',
  },
  badgeWarning: {
    backgroundColor: '#fff9db',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  textSuccess: {
    color: '#0ca678',
  },
  textDanger: {
    color: '#dc3545',
  },
  textWarning: {
    color: '#f08c00',
  },
  applicantText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0052cc',
    marginBottom: 4,
  },
  itemReason: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 6,
  },
  hrBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 10,
    paddingTop: 10,
  },
  actionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginVertical: 0,
  },
  emptyCard: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
});
