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

  const actions = [
    {
      title: "My Profile",
      caption: "Personal & Job details",
      screen: "profile",
      icon: "user-alt",
      color: "#3b82f6",
      bg: "#eff6ff"
    },
    {
      title: "My Expenses",
      caption: "Claims & Receipts",
      screen: "expenses",
      icon: "wallet",
      color: "#8b5cf6",
      bg: "#f5f3ff"
    },
    {
      title: "My Trips",
      caption: "Travel Requests",
      screen: "trips",
      icon: "plane-departure",
      color: "#06b6d4",
      bg: "#ecfeff"
    },
    {
      title: "My Documents",
      caption: "Certs & ID cards",
      screen: "documents",
      icon: "file-invoice",
      color: "#6366f1",
      bg: "#eef2ff"
    },
    {
      title: "Notice Board",
      caption: "Announcements",
      screen: "notice-board",
      icon: "bullhorn",
      color: "#ec4899",
      bg: "#fdf2f8"
    },
    {
      title: "Leaves Hub",
      caption: "Absence logs & Balance",
      screen: "leaves",
      icon: "calendar-check",
      color: "#f59e0b",
      bg: "#fffbeb"
    },
    {
      title: "Payslips",
      caption: "Payroll statements",
      screen: "payslips",
      icon: "money-bill-wave",
      color: "#059669",
      bg: "#ecfdf5"
    },
    {
      title: "Department Hub",
      caption: "Team Overview",
      screen: "department",
      icon: "users",
      color: "#14b8a6",
      bg: "#f0fdfa"
    },
    {
      title: "Security Settings",
      caption: "Update credentials",
      screen: "profile",
      icon: "key",
      color: "#64748b",
      bg: "#f8fafc"
    }
  ];

  const isPunchedIn = data?.attendance && !data.attendance.punchOut;
  const isShiftCompleted = data?.attendance?.punchIn && data?.attendance?.punchOut;

  const daysPresent = data?.daysPresent || 0;
  const workingDays = data?.workingDays || 0;
  const leavesTaken = data?.leavesTaken || 0;
  const attendancePercentage = data?.attendancePercentage || 0;

  const leavesProgress = Math.min(100, Math.round((leavesTaken / 4) * 100));
  const presenceProgress = workingDays > 0 ? Math.min(100, Math.round((daysPresent / workingDays) * 100)) : 0;

  return (
    <View style={styles.container}>
      <Header
        title="Employee Terminal"
        subtitle="Flight Operations & Performance Terminal"
        onLogout={onLogout}
        role="EMPLOYEE"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Welcome Header Widget */}
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeLeft}>
            <Text style={styles.welcomeGreet}>Welcome Back,</Text>
            <Text style={styles.welcomeName}>
              {data?.employee?.firstName || user?.firstName || 'Officer'} {data?.employee?.lastName || user?.lastName || ''}
            </Text>
            <Text style={styles.welcomeRole}>
              {data?.employee?.designation || 'Flight Operations Team'}
            </Text>
          </View>
          <View style={styles.welcomeRight}>
            <View style={styles.welcomeAvatar}>
              <Text style={styles.welcomeAvatarText}>
                {(data?.employee?.firstName || user?.firstName || 'E').charAt(0).toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

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
        <View style={styles.metricsGrid}>
          {/* Attendance Rate */}
          <View style={[styles.metricKpiCard, { borderLeftColor: '#3b82f6' }]}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>Attendance Rate</Text>
              <View style={[styles.kpiIconCircle, { backgroundColor: '#eff6ff' }]}>
                <FontAwesome5 name="percent" size={9} color="#3b82f6" />
              </View>
            </View>
            <View style={styles.kpiValueRow}>
              <Text style={styles.kpiNum}>{attendancePercentage}</Text>
              <Text style={styles.kpiTotal}>%</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { backgroundColor: '#3b82f6', width: `${attendancePercentage}%` }]} />
            </View>
            <Text style={styles.kpiSub}>Target: 85% Attendance</Text>
          </View>

          {/* Days Present */}
          <View style={[styles.metricKpiCard, { borderLeftColor: '#10b981' }]}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>Days Present</Text>
              <View style={[styles.kpiIconCircle, { backgroundColor: '#ecfdf5' }]}>
                <FontAwesome5 name="user-check" size={9} color="#10b981" />
              </View>
            </View>
            <View style={styles.kpiValueRow}>
              <Text style={styles.kpiNum}>{daysPresent}</Text>
              <Text style={styles.kpiTotal}>/ {workingDays}</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { backgroundColor: '#10b981', width: `${presenceProgress}%` }]} />
            </View>
            <Text style={styles.kpiSub}>Active duty recorded</Text>
          </View>

          {/* Leaves Taken */}
          <View style={[styles.metricKpiCard, { borderLeftColor: '#f59e0b' }]}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>Leaves Taken</Text>
              <View style={[styles.kpiIconCircle, { backgroundColor: '#fffbeb' }]}>
                <FontAwesome5 name="calendar-times" size={9} color="#f59e0b" />
              </View>
            </View>
            <View style={styles.kpiValueRow}>
              <Text style={styles.kpiNum}>{leavesTaken}</Text>
              <Text style={styles.kpiTotal}> Days</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { backgroundColor: '#f59e0b', width: `${leavesProgress}%` }]} />
            </View>
            <Text style={styles.kpiSub}>Approved monthly leave</Text>
          </View>

          {/* Working Days */}
          <View style={[styles.metricKpiCard, { borderLeftColor: '#8b5cf6' }]}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>Working Days</Text>
              <View style={[styles.kpiIconCircle, { backgroundColor: '#f5f3ff' }]}>
                <FontAwesome5 name="briefcase" size={9} color="#8b5cf6" />
              </View>
            </View>
            <View style={styles.kpiValueRow}>
              <Text style={styles.kpiNum}>{workingDays}</Text>
              <Text style={styles.kpiTotal}> Days</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { backgroundColor: '#8b5cf6', width: '100%' }]} />
            </View>
            <Text style={styles.kpiSub}>Scheduled work days</Text>
          </View>
        </View>

        {/* Employee Core Resources Grid */}
        <Text style={styles.sectionTitle}>Employee Core Hub</Text>
        <View style={styles.actionsGrid}>
          {actions.map((act, index) => (
            <TouchableOpacity
              key={index}
              style={styles.gridCard}
              onPress={() => onNavigate(act.screen)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconCircle, { backgroundColor: act.bg }]}>
                <FontAwesome5 name={act.icon} size={14} color={act.color} />
              </View>
              <View style={styles.gridCardDetails}>
                <Text style={styles.gridCardTitle}>{act.title}</Text>
                <Text style={styles.gridCardCaption}>{act.caption}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
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
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 2,
  },
  gridCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  gridCardDetails: {
    flex: 1,
  },
  gridCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  gridCardCaption: {
    fontSize: 8,
    color: '#64748b',
    marginTop: 2.5,
    lineHeight: 10,
  },
  welcomeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 8,
  },
  welcomeLeft: {
    flex: 1,
  },
  welcomeGreet: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  welcomeName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  welcomeRole: {
    fontSize: 10,
    color: '#0052cc',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  welcomeRight: {
    marginLeft: 16,
  },
  welcomeAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#bfdbfe',
    borderWidth: 1,
  },
  welcomeAvatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0052cc',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 2,
  },
  metricKpiCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    borderLeftWidth: 4,
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 10,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  kpiIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 6,
  },
  kpiNum: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  kpiTotal: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    marginLeft: 3,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  kpiSub: {
    fontSize: 8,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 6,
  },
});












