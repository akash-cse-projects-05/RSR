import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, TouchableOpacity, Platform } from 'react-native';
import Card from '../components/Card';
import Button from '../components/Button';
import Header from '../components/Header';
import { getEmployeeDashboard, checkIn } from '../api';
import * as Location from 'expo-location';
import { FontAwesome5 } from '@expo/vector-icons';

export default function EmployeeDashboard({ onNavigate, onLogout, user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  // Check-In states
  const [checkInStatus, setCheckInStatus] = useState('Log current location');
  const [checkInLoading, setCheckInLoading] = useState(false);

  // Live ticking clock for shift punches
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    try {
      const response = await getEmployeeDashboard();
      setData(response);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const performCheckIn = async () => {
    setCheckInLoading(true);
    setCheckInStatus('Acquiring GPS...');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please grant location permissions to check in.');
        setCheckInStatus('Permission Denied');
        setCheckInLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      let addressStr = '';
      try {
        const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geo && geo.length > 0) {
          addressStr = `${geo[0].street || ''}, ${geo[0].city || ''}`;
        }
      } catch (err) {}

      setCheckInStatus('Sending update...');
      await checkIn(latitude, longitude, addressStr);
      setCheckInStatus('Checked In! ✓');
      Alert.alert('Checked In', 'Your current location coordinates have been logged successfully.');
      setTimeout(() => {
        setCheckInStatus('Log current location');
      }, 3000);
    } catch (err) {
      console.error(err);
      setCheckInStatus('Check-In Failed');
      Alert.alert('Failed', 'Network request failed or GPS signal lost.');
      setTimeout(() => {
        setCheckInStatus('Log current location');
      }, 3000);
    } finally {
      setCheckInLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading && !data) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading Terminal...</Text>
      </View>
    );
  }

  const isPunchedIn = data?.attendance && !data.attendance.punchOut;
  const isShiftCompleted = data?.attendance?.punchIn && data?.attendance?.punchOut;

  return (
    <View style={styles.container}>
      <Header
        title={`Welcome, ${data?.employee?.firstName || user.firstName}`}
        subtitle={data?.employee?.designation || 'Flight Operations Team'}
        onLogout={onLogout}
        role="EMPLOYEE"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Date and Time Bar */}
        <View style={styles.timeBar}>
          <Text style={styles.dateText}>{new Date().toDateString()}</Text>
          <Text style={styles.timeText}>{time}</Text>
        </View>

        {/* Today's Attendance Card */}
        <Card accentColor={isPunchedIn ? '#e6fcf5' : '#fff9db'}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <FontAwesome5 name="clock" size={14} color="#091e42" style={{ marginRight: 6 }} />
            <Text style={[styles.cardTitle, { marginBottom: 0 }]}>Today's Attendance</Text>
          </View>
          <View style={styles.attendanceRow}>
            <View style={styles.attendanceLeft}>
              {!data?.attendance ? (
                <View>
                  <Text style={[styles.statusText, styles.textDanger]}>Status: Not Marked</Text>
                  <Text style={styles.statusSub}>No record for today.</Text>
                </View>
              ) : !data.attendance.punchOut ? (
                <View>
                  <Text style={[styles.statusText, styles.textWarning]}>Status: In Progress</Text>
                  <Text style={styles.statusSub}>
                    Punch In: {new Date(data.attendance.punchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              ) : (
                <View>
                  <Text style={[styles.statusText, styles.textSuccess]}>Status: Completed</Text>
                  <Text style={styles.statusSub}>
                    In: {new Date(data.attendance.punchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} | Out: {new Date(data.attendance.punchOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              )}
            </View>
            <Button
              title="Mark Attendance"
              type="primary"
              onPress={() => onNavigate('attendance')}
              style={styles.markBtn}
              icon={<FontAwesome5 name="map-marked-alt" size={14} color="#ffffff" />}
            />
          </View>
          <View style={styles.divider} />
          <TouchableOpacity onPress={() => onNavigate('regularization')} style={styles.regularizationLinkRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <FontAwesome5 name="file-signature" size={12} color="#0052cc" style={{ marginRight: 6 }} />
              <Text style={styles.regularizationLink}>Attendance Regularization</Text>
            </View>
          </TouchableOpacity>
        </Card>

        {/* Field Operations */}
        <Text style={styles.sectionTitle}>Field Operations</Text>
        <TouchableOpacity
          style={styles.actionItemRow}
          onPress={performCheckIn}
          disabled={checkInLoading}
          activeOpacity={0.7}
        >
          <View style={styles.actionIconBg}>
            <FontAwesome5 name="map-marker-alt" size={16} color="#0052cc" />
          </View>
          <View style={styles.actionTextCol}>
            <Text style={styles.actionTitleText}>Instant Check-In</Text>
            <Text style={styles.actionSubText}>{checkInStatus}</Text>
          </View>
          <FontAwesome5 name="chevron-right" size={10} color="#cbd5e1" />
        </TouchableOpacity>

        {/* Monthly Performance Stats */}
        <Text style={styles.sectionTitle}>Monthly Metrics</Text>
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={styles.statNum}>{data?.daysPresent || 0}</Text>
            <Text style={styles.statLabel}>Present</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statNum}>{data?.leavesTaken || 0}</Text>
            <Text style={styles.statLabel}>Leaves</Text>
          </Card>
          <Card style={[styles.statCard, { flex: 1.2 }]}>
            <Text style={[styles.statNum, styles.blueText]}>{data?.attendancePercentage || 0}%</Text>
            <Text style={styles.statLabel}>Attendance</Text>
          </Card>
        </View>

        {/* Resources & Operations Stack */}
        <Text style={styles.sectionTitle}>Resources</Text>

        <TouchableOpacity
          style={styles.actionItemRow}
          onPress={() => onNavigate('expenses')}
          activeOpacity={0.7}
        >
          <View style={styles.actionIconBg}>
            <FontAwesome5 name="wallet" size={14} color="#0052cc" />
          </View>
          <View style={styles.actionTextCol}>
            <Text style={styles.actionTitleText}>My Expenses</Text>
            <Text style={styles.actionSubText}>Claims & Reimbursements</Text>
          </View>
          <FontAwesome5 name="chevron-right" size={10} color="#cbd5e1" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionItemRow}
          onPress={() => onNavigate('trips')}
          activeOpacity={0.7}
        >
          <View style={styles.actionIconBg}>
            <FontAwesome5 name="plane-departure" size={14} color="#0052cc" />
          </View>
          <View style={styles.actionTextCol}>
            <Text style={styles.actionTitleText}>My Trips</Text>
            <Text style={styles.actionSubText}>Travel Requests & History</Text>
          </View>
          <FontAwesome5 name="chevron-right" size={10} color="#cbd5e1" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionItemRow}
          onPress={() => onNavigate('documents')}
          activeOpacity={0.7}
        >
          <View style={styles.actionIconBg}>
            <FontAwesome5 name="file-invoice" size={14} color="#0052cc" />
          </View>
          <View style={styles.actionTextCol}>
            <Text style={styles.actionTitleText}>My Documents</Text>
            <Text style={styles.actionSubText}>ID Cards & Certs</Text>
          </View>
          <FontAwesome5 name="chevron-right" size={10} color="#cbd5e1" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionItemRow}
          onPress={() => onNavigate('notice-board')}
          activeOpacity={0.7}
        >
          <View style={styles.actionIconBg}>
            <FontAwesome5 name="bullhorn" size={14} color="#0052cc" />
          </View>
          <View style={styles.actionTextCol}>
            <Text style={styles.actionTitleText}>Notice Board</Text>
            <Text style={styles.actionSubText}>Announcements</Text>
          </View>
          <FontAwesome5 name="chevron-right" size={10} color="#cbd5e1" />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Operations</Text>

        <TouchableOpacity
          style={styles.actionItemRow}
          onPress={() => onNavigate('leaves')}
          activeOpacity={0.7}
        >
          <View style={styles.actionIconBg}>
            <FontAwesome5 name="calendar-check" size={14} color="#0052cc" />
          </View>
          <View style={styles.actionTextCol}>
            <Text style={styles.actionTitleText}>Leaves Management</Text>
            <Text style={styles.actionSubText}>Check Absence Logs & Balance</Text>
          </View>
          <FontAwesome5 name="chevron-right" size={10} color="#cbd5e1" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionItemRow}
          onPress={() => onNavigate('payslips')}
          activeOpacity={0.7}
        >
          <View style={styles.actionIconBg}>
            <FontAwesome5 name="money-bill-wave" size={14} color="#0052cc" />
          </View>
          <View style={styles.actionTextCol}>
            <Text style={styles.actionTitleText}>Payslips</Text>
            <Text style={styles.actionSubText}>Download Payroll Statements</Text>
          </View>
          <FontAwesome5 name="chevron-right" size={10} color="#cbd5e1" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionItemRow}
          onPress={() => onNavigate('department')}
          activeOpacity={0.7}
        >
          <View style={styles.actionIconBg}>
            <FontAwesome5 name="users" size={14} color="#0052cc" />
          </View>
          <View style={styles.actionTextCol}>
            <Text style={styles.actionTitleText}>Department Dashboard</Text>
            <Text style={styles.actionSubText}>Team View & Announcements</Text>
          </View>
          <FontAwesome5 name="chevron-right" size={10} color="#cbd5e1" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionItemRow}
          onPress={() => onNavigate('profile')}
          activeOpacity={0.7}
        >
          <View style={styles.actionIconBg}>
            <FontAwesome5 name="key" size={14} color="#0052cc" />
          </View>
          <View style={styles.actionTextCol}>
            <Text style={styles.actionTitleText}>Change Password</Text>
            <Text style={styles.actionSubText}>Update Security Credentials</Text>
          </View>
          <FontAwesome5 name="chevron-right" size={10} color="#cbd5e1" />
        </TouchableOpacity>
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
  timeBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  timeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0052cc',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    marginVertical: 0,
    padding: 14,
  },
  statNum: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
  },
  blueText: {
    color: '#0052cc',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginTop: 4,
  },
  attendanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  attendanceLeft: {
    flex: 1,
    marginRight: 12,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  statusSub: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  markBtn: {
    marginVertical: 0,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 12,
  },
  regularizationLinkRow: {
    alignSelf: 'flex-start',
  },
  regularizationLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0052cc',
  },
  actionItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  actionIconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  actionTextCol: {
    flex: 1,
  },
  actionTitleText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  actionSubText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
  },
  textSuccess: {
    color: '#28a745',
  },
  textDanger: {
    color: '#dc3545',
  },
  textWarning: {
    color: '#f08c00',
  },
});
