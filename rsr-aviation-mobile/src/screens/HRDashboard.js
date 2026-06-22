import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import Card from '../components/Card';
import Header from '../components/Header';
import { getHRDashboard } from '../api';
import { FontAwesome5 } from '@expo/vector-icons';

export default function HRDashboard({ onNavigate, onLogout, user }) {
  const [metrics, setMetrics] = useState(null);
  const [attendanceList, setAttendanceList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const response = await getHRDashboard();
      setMetrics({
        totalEmployees: response.totalEmployees,
        present: response.present,
        completed: response.completed,
        inProgress: response.inProgress,
        absent: response.absent,
      });
      setAttendanceList(response.todayAttendance || []);
    } catch (error) {
      console.error(error);
      Alert.alert('Load Failed', 'Failed to retrieve HR control metrics.');
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

  if (loading && !metrics) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Connecting to HR Terminal...</Text>
      </View>
    );
  }

  const actions = [
    {
      title: "Users Directory",
      caption: "Manage employee accounts",
      screen: "hr-users",
      icon: "users",
      color: "#3b82f6",
      bg: "#eff6ff"
    },
    {
      title: "New Onboarding",
      caption: "Add new system users",
      screen: "hr-recruitment",
      icon: "user-plus",
      color: "#10b981",
      bg: "#ecfdf5"
    },
    {
      title: "Leave Requests",
      caption: "Approve time-off requests",
      screen: "leaves",
      icon: "calendar-check",
      color: "#f59e0b",
      bg: "#fffbeb"
    },
    {
      title: "Expense Claims",
      caption: "Verify reimbursement receipts",
      screen: "expenses",
      icon: "wallet",
      color: "#8b5cf6",
      bg: "#f5f3ff"
    },
    {
      title: "Trip Tracking",
      caption: "Live flight/transit routes",
      screen: "trips",
      icon: "plane-departure",
      color: "#06b6d4",
      bg: "#ecfeff"
    },
    {
      title: "Broadcast Center",
      caption: "Notice board announcements",
      screen: "notice-board",
      icon: "bullhorn",
      color: "#ec4899",
      bg: "#fdf2f8"
    },
    {
      title: "Payroll Console",
      caption: "Generate employee payslips",
      screen: "payslips",
      icon: "money-bill-wave",
      color: "#059669",
      bg: "#ecfdf5"
    },
    {
      title: "Regularizations",
      caption: "Adjust punch coordinates",
      screen: "regularization",
      icon: "clock",
      color: "#ea580c",
      bg: "#fff7ed"
    },
    {
      title: "Review Files",
      caption: "Verify compliance uploads",
      screen: "hr-review-documents",
      icon: "file-alt",
      color: "#6366f1",
      bg: "#eef2ff"
    },
    {
      title: "Department Hub",
      caption: "Manage business units",
      screen: "department",
      icon: "building",
      color: "#14b8a6",
      bg: "#f0fdfa"
    },
    {
      title: "Profile Settings",
      caption: "Manage HR admin profile",
      screen: "profile",
      icon: "user-cog",
      color: "#64748b",
      bg: "#f8fafc"
    }
  ];

  const renderAttendanceItem = ({ item }) => {
    const punchInTime = item.punchIn ? new Date(item.punchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
    const punchOutTime = item.punchOut ? new Date(item.punchOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
    const isInProgress = !item.punchOut;
    const firstName = item.employeeId?.firstName || 'Unknown';
    const lastName = item.employeeId?.lastName || '';
    const initials = firstName.charAt(0).toUpperCase();

    return (
      <View style={styles.listItem}>
        {/* Left: Avatar Circle */}
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        {/* Middle Left: Details */}
        <View style={styles.listCol}>
          <Text style={styles.empName}>
            {firstName} {lastName}
          </Text>
          <Text style={styles.empSub}>
            {item.employeeId?.employeeCode || '-'} • {item.employeeId?.department || 'General'}
          </Text>
        </View>

        {/* Middle Right: Times */}
        <View style={styles.timeCol}>
          <View style={styles.timeRow}>
            <FontAwesome5 name="arrow-circle-right" size={10} color="#10b981" style={{ marginRight: 4 }} />
            <Text style={styles.timeText}>{punchInTime}</Text>
          </View>
          <View style={styles.timeRow}>
            <FontAwesome5 name="arrow-circle-left" size={10} color="#ef4444" style={{ marginRight: 4 }} />
            <Text style={styles.timeText}>{punchOutTime}</Text>
          </View>
        </View>

        {/* Right: Badge */}
        <View style={styles.badgeCol}>
          <View style={[styles.statusBadge, isInProgress ? styles.badgeProgress : styles.badgeCompleted]}>
            <Text style={[styles.badgeText, isInProgress ? styles.badgeTextProgress : styles.badgeTextCompleted]}>
              {isInProgress ? 'ACTIVE' : 'COMPLETED'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const presentPercentage = Math.min(100, Math.round(((metrics?.present || 0) / (metrics?.totalEmployees || 1)) * 100));
  const activePercentage = Math.min(100, Math.round(((metrics?.inProgress || 0) / (metrics?.present || 1)) * 100));
  const completedPercentage = Math.min(100, Math.round(((metrics?.completed || 0) / (metrics?.present || 1)) * 100));
  const absentPercentage = Math.min(100, Math.round(((metrics?.absent || 0) / (metrics?.totalEmployees || 1)) * 100));

  return (
    <View style={styles.container}>
      <Header
        title="HR Commander"
        subtitle="Today's Operational & Attendance Console"
        onLogout={onLogout}
        role="HR"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Welcome Header Widget */}
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeLeft}>
            <Text style={styles.welcomeGreet}>Welcome Back,</Text>
            <Text style={styles.welcomeName}>{user?.firstName || 'HR Officer'}</Text>
            <Text style={styles.welcomeRole}>Enterprise HR Administrator</Text>
          </View>
          <View style={styles.welcomeRight}>
            <View style={styles.welcomeAvatar}>
              <Text style={styles.welcomeAvatarText}>
                {(user?.firstName || 'H').charAt(0).toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Shift Metrics Grid */}
        <Text style={styles.sectionTitle}>Today's Operational Metrics</Text>
        <View style={styles.metricsGrid}>
          {/* Present */}
          <View style={[styles.metricKpiCard, { borderLeftColor: '#3b82f6' }]}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>Total Present</Text>
              <View style={[styles.kpiIconCircle, { backgroundColor: '#eff6ff' }]}>
                <FontAwesome5 name="users" size={9} color="#3b82f6" />
              </View>
            </View>
            <View style={styles.kpiValueRow}>
              <Text style={styles.kpiNum}>{metrics?.present || 0}</Text>
              <Text style={styles.kpiTotal}>/ {metrics?.totalEmployees || 0}</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { backgroundColor: '#3b82f6', width: `${presentPercentage}%` }]} />
            </View>
            <Text style={styles.kpiSub}>
              {presentPercentage}% Attendance rate
            </Text>
          </View>

          {/* Active */}
          <View style={[styles.metricKpiCard, { borderLeftColor: '#f59e0b' }]}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>Active Shifts</Text>
              <View style={[styles.kpiIconCircle, { backgroundColor: '#fffbeb' }]}>
                <FontAwesome5 name="hourglass-half" size={8} color="#f59e0b" />
              </View>
            </View>
            <View style={styles.kpiValueRow}>
              <Text style={styles.kpiNum}>{metrics?.inProgress || 0}</Text>
              <Text style={styles.kpiTotal}>/ {metrics?.present || 0}</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { backgroundColor: '#f59e0b', width: `${activePercentage}%` }]} />
            </View>
            <Text style={styles.kpiSub}>
              {activePercentage}% of present staff
            </Text>
          </View>

          {/* Completed */}
          <View style={[styles.metricKpiCard, { borderLeftColor: '#10b981' }]}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>Completed</Text>
              <View style={[styles.kpiIconCircle, { backgroundColor: '#ecfdf5' }]}>
                <FontAwesome5 name="check-circle" size={9} color="#10b981" />
              </View>
            </View>
            <View style={styles.kpiValueRow}>
              <Text style={styles.kpiNum}>{metrics?.completed || 0}</Text>
              <Text style={styles.kpiTotal}>/ {metrics?.present || 0}</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { backgroundColor: '#10b981', width: `${completedPercentage}%` }]} />
            </View>
            <Text style={styles.kpiSub}>
              {completedPercentage}% Checked out
            </Text>
          </View>

          {/* Absent */}
          <View style={[styles.metricKpiCard, { borderLeftColor: '#ef4444' }]}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>Absent</Text>
              <View style={[styles.kpiIconCircle, { backgroundColor: '#fdf2f2' }]}>
                <FontAwesome5 name="user-slash" size={8} color="#ef4444" />
              </View>
            </View>
            <View style={styles.kpiValueRow}>
              <Text style={styles.kpiNum}>{metrics?.absent || 0}</Text>
              <Text style={styles.kpiTotal}>/ {metrics?.totalEmployees || 0}</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { backgroundColor: '#ef4444', width: `${absentPercentage}%` }]} />
            </View>
            <Text style={styles.kpiSub}>
              {absentPercentage}% Absence rate
            </Text>
          </View>
        </View>

        {/* HR Console Grid */}
        <Text style={styles.sectionTitle}>HR Core Operations</Text>
        <View style={styles.actionsGrid}>
          {actions.map((act, index) => (
            <TouchableOpacity
              key={index}
              style={styles.gridCard}
              onPress={() => onNavigate(act.screen)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconCircle, { backgroundColor: act.bg }]}>
                <FontAwesome5 name={act.icon} size={15} color={act.color} />
              </View>
              <View style={styles.cardDetails}>
                <Text style={styles.cardTitle}>{act.title}</Text>
                <Text style={styles.cardCaption}>{act.caption}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Live Attendance List Header */}
        <View style={styles.listHeaderRow}>
          <Text style={styles.sectionTitle}>Live Attendance Log</Text>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>REAL-TIME</Text>
          </View>
        </View>

        {/* Live Attendance Cards list */}
        <Card style={styles.listCard}>
          {attendanceList.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No attendance records captured for today yet.</Text>
            </View>
          ) : (
            <FlatList
              data={attendanceList}
              renderItem={renderAttendanceItem}
              keyExtractor={(item) => item._id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )}
        </Card>
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
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 22,
    marginBottom: 10,
    paddingLeft: 4,
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
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardDetails: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  cardCaption: {
    fontSize: 8,
    color: '#64748b',
    marginTop: 2.5,
    lineHeight: 10,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 10,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#bbf7d0',
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#22c55e',
    marginRight: 5,
  },
  liveText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#16a34a',
  },
  listCard: {
    padding: 0,
    borderRadius: 14,
    overflow: 'hidden',
    borderColor: '#e2e8f0',
    borderWidth: 1,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  listItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderColor: '#cbd5e1',
    borderWidth: 0.5,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  listCol: {
    flex: 1.5,
  },
  empName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  empSub: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  timeCol: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 1.5,
  },
  timeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#475569',
  },
  badgeCol: {
    flex: 0.8,
    alignItems: 'flex-end',
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  badgeProgress: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    borderWidth: 0.5,
  },
  badgeCompleted: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderWidth: 0.5,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  badgeTextProgress: {
    color: '#d97706',
  },
  badgeTextCompleted: {
    color: '#059669',
  },
  separator: {
    height: 1,
    backgroundColor: '#f1f5f9',
  },
});
