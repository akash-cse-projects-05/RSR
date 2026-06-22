import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, RefreshControl, TouchableOpacity } from 'react-native';
import Card from '../components/Card';
import Button from '../components/Button';
import Header from '../components/Header';
import { getStaffTasks, getStaffTraining, acknowledgeTask, completeTask, updateTrainingProgress } from '../api';

export default function TaskManagementScreen({ onBack, user, routeParams }) {
  // Check if initial tab was specified, otherwise default to tasks
  const initialTab = (routeParams && routeParams.tab) || 'tasks';
  const [activeTab, setActiveTab] = useState(initialTab);
  
  const [tasksList, setTasksList] = useState([]);
  const [trainingList, setTrainingList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Task Completion state
  const [completingTaskId, setCompletingTaskId] = useState(null);
  const [completionNote, setCompletionNote] = useState('');

  // Training progress state
  const [editingTrainingId, setEditingTrainingId] = useState(null);
  const [progressValue, setProgressValue] = useState('');

  const department = user.department || 'Operations';
  const employeeId = user.employeeId || ''; // Retrieved from logged in user structure

  const loadData = async () => {
    if (!employeeId) return;
    try {
      if (activeTab === 'tasks') {
        const response = await getStaffTasks(department, employeeId);
        setTasksList(response.tasks || []);
      } else {
        const response = await getStaffTraining(department, employeeId);
        setTrainingList(response.tasks || []); // Backend returns training as tasks
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Load Failed', 'Failed to retrieve tasks dossiers.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, employeeId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleAcknowledge = async (taskId) => {
    setActionLoading(true);
    try {
      await acknowledgeTask(department, taskId, employeeId);
      Alert.alert('Acknowledged', 'Mission status updated to Acknowledged.');
      loadData();
    } catch (e) {
      Alert.alert('Failed', e.message || 'Error updating task status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async (taskId) => {
    setActionLoading(true);
    try {
      await completeTask(department, taskId, employeeId, completionNote.trim());
      Alert.alert('Mission Completed', 'Mission status has been updated to Completed.');
      setCompletingTaskId(null);
      setCompletionNote('');
      loadData();
    } catch (e) {
      Alert.alert('Failed', e.message || 'Error updating task status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateProgress = async (taskId) => {
    const parsed = parseInt(progressValue, 10);
    if (isNaN(parsed) || parsed < 0 || parsed > 100) {
      Alert.alert('Validation Error', 'Please enter a percentage value between 0 and 100.');
      return;
    }

    setActionLoading(true);
    try {
      await updateTrainingProgress(department, taskId, parsed);
      Alert.alert('Progress Saved', 'Training log updated successfully.');
      setEditingTrainingId(null);
      setProgressValue('');
      loadData();
    } catch (e) {
      Alert.alert('Failed', e.message || 'Error updating training log.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Missions & Training"
        subtitle="Operations cockpit and certification logs"
        onBack={onBack}
        role={user.role}
      />

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'tasks' && styles.tabActive]}
          onPress={() => {
            setActiveTab('tasks');
            setLoading(true);
          }}
        >
          <Text style={[styles.tabText, activeTab === 'tasks' && styles.tabTextActive]}>
            📋 Active Missions
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'training' && styles.tabActive]}
          onPress={() => {
            setActiveTab('training');
            setLoading(true);
          }}
        >
          <Text style={[styles.tabText, activeTab === 'training' && styles.tabTextActive]}>
            🎓 Certifications
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={styles.loaderBox}>
            <Text style={styles.loaderText}>Syncing operations logs...</Text>
          </View>
        ) : activeTab === 'tasks' ? (
          /* TASKS LIST */
          tasksList.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>No active tasks assigned to you.</Text>
            </Card>
          ) : (
            tasksList.map((task) => {
              const isPending = task.status === 'Pending';
              const isAck = task.status === 'Acknowledged';
              const isCompleted = task.status === 'Completed';

              return (
                <Card key={task._id} style={styles.taskCard}>
                  <View style={styles.taskHeader}>
                    <Text style={styles.taskType}>{task.type.toUpperCase()}</Text>
                    <View style={[
                      styles.statusBadge,
                      isCompleted ? styles.badgeSuccess : isAck ? styles.badgeInfo : styles.badgeWarning
                    ]}>
                      <Text style={[
                        styles.badgeText,
                        isCompleted ? styles.textSuccess : isAck ? styles.textInfo : styles.textWarning
                      ]}>
                        {task.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <Text style={styles.taskDesc}>{task.description}</Text>

                  {task.deadline && (
                    <Text style={styles.taskDeadline}>
                      Deadline: {new Date(task.deadline).toLocaleDateString()}
                    </Text>
                  )}

                  {task.comments && (
                    <View style={styles.commentsBox}>
                      <Text style={styles.commentsText}>Note: {task.comments}</Text>
                    </View>
                  )}

                  {/* Actions */}
                  {isPending && (
                    <Button
                      title="Acknowledge Task"
                      type="primary"
                      loading={actionLoading}
                      onPress={() => handleAcknowledge(task._id)}
                      style={styles.actionBtn}
                    />
                  )}

                  {isAck && completingTaskId !== task._id && (
                    <Button
                      title="Mark as Completed"
                      type="success"
                      onPress={() => setCompletingTaskId(task._id)}
                      style={styles.actionBtn}
                    />
                  )}

                  {completingTaskId === task._id && (
                    <View style={styles.completionForm}>
                      <TextInput
                        style={styles.noteInput}
                        value={completionNote}
                        onChangeText={setCompletionNote}
                        placeholder="Add completion notes (optional)..."
                        placeholderTextColor="#94a3b8"
                      />
                      <View style={styles.btnRow}>
                        <Button
                          title="Cancel"
                          type="secondary"
                          onPress={() => setCompletingTaskId(null)}
                          style={styles.halfBtn}
                        />
                        <Button
                          title="Confirm Complete"
                          type="success"
                          loading={actionLoading}
                          onPress={() => handleComplete(task._id)}
                          style={styles.halfBtn}
                        />
                      </View>
                    </View>
                  )}
                </Card>
              );
            })
          )
        ) : (
          /* TRAINING LIST */
          trainingList.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>No training or certifications assigned.</Text>
            </Card>
          ) : (
            trainingList.map((task) => {
              const isEditing = editingTrainingId === task._id;

              return (
                <Card key={task._id} style={styles.taskCard}>
                  <View style={styles.taskHeader}>
                    <Text style={styles.taskType}>TRAINING</Text>
                    <View style={styles.progressBadge}>
                      <Text style={styles.progressBadgeText}>{task.progress || 0}% Complete</Text>
                    </View>
                  </View>

                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <Text style={styles.taskDesc}>{task.description}</Text>

                  {/* Progress Bar UI */}
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${task.progress || 0}%` }]} />
                  </View>

                  {isEditing ? (
                    <View style={styles.completionForm}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Current Progress Percentage</Text>
                        <TextInput
                          style={styles.noteInput}
                          value={progressValue}
                          onChangeText={setProgressValue}
                          keyboardType="numeric"
                          placeholder="e.g. 75"
                          placeholderTextColor="#94a3b8"
                          maxLength={3}
                        />
                      </View>
                      <View style={styles.btnRow}>
                        <Button
                          title="Cancel"
                          type="secondary"
                          onPress={() => setEditingTrainingId(null)}
                          style={styles.halfBtn}
                        />
                        <Button
                          title="Save Progress"
                          type="primary"
                          loading={actionLoading}
                          onPress={() => handleUpdateProgress(task._id)}
                          style={styles.halfBtn}
                        />
                      </View>
                    </View>
                  ) : (
                    <Button
                      title="Update Training Progress"
                      type="secondary"
                      onPress={() => {
                        setEditingTrainingId(task._id);
                        setProgressValue(String(task.progress || 0));
                      }}
                      style={styles.actionBtn}
                    />
                  )}
                </Card>
              );
            })
          )
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
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 3,
    borderColor: 'transparent',
  },
  tabActive: {
    borderColor: '#0052cc',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#0052cc',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loaderBox: {
    padding: 40,
    alignItems: 'center',
  },
  loaderText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
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
  taskCard: {
    marginVertical: 6,
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
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeSuccess: {
    backgroundColor: '#e6fcf5',
  },
  badgeInfo: {
    backgroundColor: '#e6f0ff',
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
    color: '#28a745',
  },
  textInfo: {
    color: '#0052cc',
  },
  textWarning: {
    color: '#ffc107',
  },
  progressBadge: {
    backgroundColor: '#e6f0ff',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  progressBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0052cc',
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  taskDesc: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 8,
  },
  taskDeadline: {
    fontSize: 11,
    color: '#dc3545',
    fontWeight: '700',
    marginBottom: 4,
  },
  commentsBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 8,
    marginVertical: 6,
    borderLeftWidth: 3,
    borderColor: '#e2e8f0',
  },
  commentsText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  actionBtn: {
    marginTop: 12,
    marginVertical: 0,
    paddingVertical: 10,
  },
  completionForm: {
    marginTop: 12,
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
    paddingTop: 12,
  },
  noteInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 13,
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 10,
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
  progressBarBg: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    width: '100%',
    marginVertical: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#28a745',
    borderRadius: 4,
  },
  inputGroup: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
});
