import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import Card from '../components/Card';
import Button from '../components/Button';
import Header from '../components/Header';
import { getDepartmentDashboard } from '../api';
import { FontAwesome5 } from '@expo/vector-icons';

export default function DepartmentDashboardScreen({ onNavigate, onBack, user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Retrieve department from user profile
  const department = user.department || 'Operations';

  const loadData = async () => {
    try {
      const response = await getDepartmentDashboard(department);
      setData(response);
    } catch (e) {
      console.error(e);
      Alert.alert('Load Failed', 'Failed to retrieve department logs.');
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

  if (loading && !data) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Connecting to Department Hub...</Text>
      </View>
    );
  }

  const employees = data?.employees || [];
  const announcements = data?.announcements || [];
  const tasks = data?.tasks || [];
  
  // Find current employee metadata
  const currentEmp = data?.employee || {};
  const isManager = currentEmp.designation === 'MANAGER' || currentEmp.designation === 'Manager';

  return (
    <View style={styles.container}>
      <Header
        title={`${department} Department`}
        subtitle="Team monitoring, task allocation, and broadcasts"
        onBack={onBack}
        role={user.role}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Manager Controls Entry */}
        {isManager && (
          <Card style={styles.managerHeaderCard} accentColor="#e6f0ff">
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <FontAwesome5 name="shield-alt" size={14} color="#0052cc" style={{ marginRight: 6 }} />
              <Text style={[styles.managerTitle, { marginBottom: 0 }]}>Manager Admin Controls</Text>
            </View>
            <Text style={styles.managerSub}>Authorize WFH, allot tasks, process leaves & resignations.</Text>
            <Button
              title="Go to Manager Console"
              type="primary"
              onPress={() => onNavigate('manager-controls')}
              style={styles.managerBtn}
            />
          </Card>
        )}

        {/* Staff controls */}
        {!isManager && (
          <>
            <Text style={styles.sectionTitle}>My Tasks & Training</Text>
            <Card style={styles.staffControlsCard}>
              <View style={styles.btnRow}>
                <Button
                  title="My Tasks"
                  type="primary"
                  onPress={() => onNavigate('task-management', { tab: 'tasks' })}
                  style={styles.halfBtn}
                  icon={<FontAwesome5 name="clipboard-list" size={14} color="#ffffff" />}
                />
                <Button
                  title="My Training"
                  type="secondary"
                  onPress={() => onNavigate('task-management', { tab: 'training' })}
                  style={styles.halfBtn}
                  icon={<FontAwesome5 name="graduation-cap" size={14} color="#0052cc" />}
                />
              </View>
            </Card>
          </>
        )}

        {/* Team list */}
        <Text style={styles.sectionTitle}>Crew Members ({employees.length})</Text>
        <Card style={styles.listCard}>
          {employees.length === 0 ? (
            <Text style={styles.emptyText}>No department personnel registered.</Text>
          ) : (
            employees.map((emp) => (
              <View key={emp._id} style={styles.listItem}>
                <View style={styles.avatarIcon}>
                  <Text style={styles.avatarLetter}>
                    {emp.firstName ? emp.firstName.charAt(0).toUpperCase() : 'U'}
                  </Text>
                </View>
                <View style={styles.listItemText}>
                  <Text style={styles.empName}>{emp.firstName} {emp.lastName}</Text>
                  <Text style={styles.empDesignation}>{emp.designation}</Text>
                </View>
              </View>
            ))
          )}
        </Card>

        {/* Department Announcements */}
        <Text style={styles.sectionTitle}>Department Broadcast Board</Text>
        {announcements.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>No announcements posted to this department yet.</Text>
          </Card>
        ) : (
          announcements.map((ann) => (
            <Card key={ann._id} style={styles.annCard}>
              <Text style={styles.annTitle}>{ann.title}</Text>
              <Text style={styles.annMessage}>{ann.message}</Text>
              <Text style={styles.annDate}>
                Posted: {new Date(ann.date).toLocaleDateString()}
              </Text>
            </Card>
          ))
        )}

        {/* Active Tasks list */}
        <Text style={styles.sectionTitle}>Active Missions / Tasks ({tasks.length})</Text>
        {tasks.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>No tasks deployed in this department.</Text>
          </Card>
        ) : (
          tasks.map((task) => {
            const assignedEmp = employees.find(e => e._id === task.assignedTo);
            const isCompleted = task.status === 'Completed';

            return (
              <Card key={task._id} style={styles.taskCard}>
                <View style={styles.taskHeader}>
                  <Text style={styles.taskType}>{task.type.toUpperCase()}</Text>
                  <View style={[
                    styles.taskStatusBadge,
                    isCompleted ? styles.badgeSuccess : styles.badgeWarning
                  ]}>
                    <Text style={[
                      styles.taskStatusText,
                      isCompleted ? styles.textSuccess : styles.textWarning
                    ]}>
                      {task.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.taskTitle}>{task.title}</Text>
                <Text style={styles.taskDesc}>{task.description}</Text>
                
                <Text style={styles.taskAssignee}>
                  Assigned to: {assignedEmp ? `${assignedEmp.firstName} ${assignedEmp.lastName}` : 'Unknown'}
                </Text>
                
                {task.comments && (
                  <View style={styles.commentsBox}>
                    <Text style={styles.commentsText}>Note: {task.comments}</Text>
                  </View>
                )}
              </Card>
            );
          })
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
  managerHeaderCard: {
    marginBottom: 10,
    padding: 14,
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
  managerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  managerSub: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 4,
    lineHeight: 18,
  },
  managerBtn: {
    marginTop: 12,
    marginVertical: 0,
  },
  staffControlsCard: {
    padding: 12,
    marginBottom: 10,
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
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  halfBtn: {
    flex: 1,
    marginVertical: 0,
  },
  listCard: {
    paddingVertical: 8,
    marginBottom: 10,
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
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  avatarIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e6f0ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarLetter: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0052cc',
  },
  listItemText: {
    flex: 1,
  },
  empName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  empDesignation: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 1,
  },
  emptyCard: {
    padding: 30,
    alignItems: 'center',
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
  emptyText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  annCard: {
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
  annTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  annMessage: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    lineHeight: 18,
  },
  annDate: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 8,
    fontWeight: '600',
  },
  taskCard: {
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
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  taskType: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0052cc',
  },
  taskStatusBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeSuccess: {
    backgroundColor: '#e6fcf5',
  },
  badgeWarning: {
    backgroundColor: '#fff9db',
  },
  taskStatusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  textSuccess: {
    color: '#28a745',
  },
  textWarning: {
    color: '#f59e0b',
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  taskDesc: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    lineHeight: 16,
    marginBottom: 8,
  },
  taskAssignee: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  commentsBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderColor: '#e2e8f0',
  },
  commentsText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    fontStyle: 'italic',
  },
});
