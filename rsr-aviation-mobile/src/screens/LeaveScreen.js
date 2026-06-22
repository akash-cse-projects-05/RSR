import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, RefreshControl, FlatList } from 'react-native';
import Card from '../components/Card';
import Button from '../components/Button';
import Header from '../components/Header';
import { getLeaves, applyLeave, leaveAction, getEmployeeDashboard } from '../api';

export default function LeaveScreen({ onBack, user }) {
  const isHR = user.role === 'HR';
  const [leavesList, setLeavesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [balance, setBalance] = useState({ leaveBalance: 0, lopCount: 0 });

  // Apply leave form states (Employee)
  const [leaveType, setLeaveType] = useState('Casual');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [totalDays, setTotalDays] = useState('');
  const [reason, setReason] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  // Action states (HR)
  const [remarkText, setRemarkText] = useState({});

  const loadData = async () => {
    try {
      const leavesData = await getLeaves(isHR);
      setLeavesList(isHR ? leavesData.leaves || [] : leavesData || []);

      if (!isHR) {
        const dashData = await getEmployeeDashboard();
        setBalance({
          leaveBalance: dashData?.employee?.leaveBalance || 0,
          lopCount: dashData?.employee?.lopCount || 0
        });
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to retrieve leaves data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApply = async () => {
    if (!fromDate || !toDate || !totalDays || !reason) {
      Alert.alert('Validation Error', 'All fields are required.');
      return;
    }

    setSubmitLoading(true);
    try {
      await applyLeave({
        leaveType,
        fromDate,
        toDate,
        totalDays: parseInt(totalDays),
        reason
      });
      Alert.alert('Applied', 'Leave request submitted successfully.');
      // Reset Form
      setFromDate('');
      setToDate('');
      setTotalDays('');
      setReason('');
      loadData();
    } catch (error) {
      Alert.alert('Request Failed', error.message || 'Error submitting leave request.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleHRAction = async (id, status) => {
    const remark = remarkText[id] || '';
    try {
      await leaveAction(id, {
        status,
        hrRemark: remark,
        rejectionReason: remark
      });
      Alert.alert('Action Logged', `Leave request successfully ${status.toLowerCase()}ed.`);
      loadData();
    } catch (error) {
      Alert.alert('Action Failed', error.message || 'Error processing leave status.');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const renderLeaveItem = ({ item }) => {
    const isPending = item.status === 'PENDING' || item.status === 'Pending';
    const isApproved = item.status === 'APPROVED' || item.status === 'Approved';
    const isRejected = item.status === 'REJECTED' || item.status === 'Rejected';

    return (
      <Card style={styles.itemCard} accentColor={isApproved ? '#e6fcf5' : isRejected ? '#ffe3e3' : '#fff9db'}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemTitle}>{item.leaveType} Leave</Text>
          <View style={[styles.statusBadge, isApproved ? styles.badgeSuccess : isRejected ? styles.badgeDanger : styles.badgeWarning]}>
            <Text style={[styles.badgeText, isApproved ? styles.textSuccess : isRejected ? styles.textDanger : styles.textWarning]}>
              {item.status}
            </Text>
          </View>
        </View>

        {isHR && (
          <Text style={styles.applicantText}>
            Applicant: {item.employeeId?.firstName} {item.employeeId?.lastName} ({item.employeeId?.employeeCode})
          </Text>
        )}

        <Text style={styles.itemDates}>
          Dates: {item.fromDate} to {item.toDate} ({item.totalDays} days)
        </Text>
        <Text style={styles.itemReason}>Reason: {item.reason}</Text>
        {item.hrRemark ? <Text style={styles.itemRemark}>HR Remark: {item.hrRemark}</Text> : null}

        {isHR && isPending && (
          <View style={styles.hrActionBox}>
            <TextInput
              style={styles.remarkInput}
              value={remarkText[item._id] || ''}
              onChangeText={(text) => setRemarkText({ ...remarkText, [item._id]: text })}
              placeholder="Add HR remark / reason..."
              placeholderTextColor="#94a3b8"
            />
            <View style={styles.hrBtnRow}>
              <Button
                title="Reject"
                type="danger"
                onPress={() => handleHRAction(item._id, 'REJECTED')}
                style={styles.actionBtn}
              />
              <Button
                title="Approve"
                type="success"
                onPress={() => handleHRAction(item._id, 'APPROVED')}
                style={styles.actionBtn}
              />
            </View>
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title={isHR ? 'Leave Operations' : 'My Leaves'}
        subtitle={isHR ? 'Personnel absence logs and reviews' : 'Check balances and file leave requests'}
        onBack={onBack}
        role={user.role}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Employee Balance Card */}
        {!isHR && (
          <View style={styles.balanceRow}>
            <Card style={styles.balanceCard}>
              <Text style={styles.balanceNum}>{balance.leaveBalance}</Text>
              <Text style={styles.balanceLabel}>Casual Leaves</Text>
            </Card>
            <Card style={styles.balanceCard}>
              <Text style={[styles.balanceNum, styles.redText]}>{balance.lopCount}</Text>
              <Text style={styles.balanceLabel}>LOP Days</Text>
            </Card>
          </View>
        )}

        {/* Employee Apply Leave Form */}
        {!isHR && (
          <Card style={styles.formCard}>
            <Text style={styles.sectionTitle}>Apply For Leave</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Leave Type</Text>
              <TextInput
                style={styles.input}
                value={leaveType}
                onChangeText={setLeaveType}
                placeholder="Casual, LOP, Medical"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.rowInputs}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>From Date</Text>
                <TextInput
                  style={styles.input}
                  value={fromDate}
                  onChangeText={setFromDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94a3b8"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>To Date</Text>
                <TextInput
                  style={styles.input}
                  value={toDate}
                  onChangeText={setToDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Total Days</Text>
              <TextInput
                style={styles.input}
                value={totalDays}
                onChangeText={setTotalDays}
                keyboardType="numeric"
                placeholder="Number of days"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Reason</Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={3}
                placeholder="Reason for leaving"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <Button
              title="Submit Leave Application"
              onPress={handleApply}
              loading={submitLoading}
            />
          </Card>
        )}

        {/* Leave Requests Log */}
        <Text style={styles.sectionTitle}>{isHR ? 'Review Absence Requests' : 'Absence History'}</Text>
        {leavesList.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>No leave entries found.</Text>
          </Card>
        ) : (
          <FlatList
            data={leavesList}
            renderItem={renderLeaveItem}
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
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  balanceCard: {
    flex: 1,
    alignItems: 'center',
    marginVertical: 0,
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
  balanceNum: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
  },
  redText: {
    color: '#dc3545',
  },
  balanceLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginTop: 4,
  },
  formCard: {
    marginBottom: 20,
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
  rowInputs: {
    flexDirection: 'row',
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
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 13,
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
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
    marginBottom: 8,
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
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
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
    fontSize: 13,
    fontWeight: '600',
    color: '#0052cc',
    marginBottom: 6,
  },
  itemDates: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  itemReason: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  itemRemark: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    fontStyle: 'italic',
    marginTop: 4,
  },
  hrActionBox: {
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 12,
    paddingTop: 12,
  },
  remarkInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 10,
  },
  hrBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
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
