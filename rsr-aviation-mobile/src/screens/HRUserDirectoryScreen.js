import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import Card from '../components/Card';
import Header from '../components/Header';
import { getHRUsers, toggleHRUserStatus } from '../api';
import { FontAwesome5 } from '@expo/vector-icons';

export default function HRUserDirectoryScreen({ onNavigate, onBack, user: currentUser }) {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // stores employeeId of toggling user

  const loadUsers = async () => {
    try {
      const response = await getHRUsers();
      console.log("HR Users directory response:", response);
      setUsers(response.users || []);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to retrieve system user directory.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  const handleToggleStatus = async (employeeId, currentStatus, empName) => {
    const nextAction = currentStatus === 'Active' ? 'TERMINATE access for' : 'RESTORE access for';
    Alert.alert(
      'Confirm Action',
      `Are you sure you want to ${nextAction} ${empName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: currentStatus === 'Active' ? 'destructive' : 'default',
          onPress: async () => {
            setActionLoading(employeeId);
            try {
              const res = await toggleHRUserStatus(employeeId);
              Alert.alert('Success', `Employee status changed to ${res.status}.`);
              loadUsers();
            } catch (e) {
              Alert.alert('Failed', e.message || 'Error updating employee status.');
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]
    );
  };

  // Filter users based on search
  const filteredUsers = users.filter((u) => {
    const emp = u.employeeId;
    if (!emp) return u.username.toLowerCase().includes(searchQuery.toLowerCase());
    
    const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
    const code = (emp.employeeCode || '').toLowerCase();
    const dept = (emp.department || '').toLowerCase();
    const username = (u.username || '').toLowerCase();
    const query = searchQuery.toLowerCase();

    return fullName.includes(query) || code.includes(query) || dept.includes(query) || username.includes(query);
  });

  return (
    <View style={styles.container}>
      <Header
        title="User Directory"
        subtitle="Manage employee accounts and system access credentials"
        onBack={onBack}
        role={currentUser.role}
      />

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, employee code, or department..."
          placeholderTextColor="#717171"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.sectionTitle}>ADMINISTRATION</Text>

        {loading && users.length === 0 ? (
          <View style={styles.loadingWrapper}>
            <ActivityIndicator size="large" color="#0052cc" />
            <Text style={styles.loadingText}>Loading user registry...</Text>
          </View>
        ) : filteredUsers.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>No users found in the system.</Text>
          </Card>
        ) : (
          filteredUsers.map((userItem) => {
            const emp = userItem.employeeId;
            const hasEmpRecord = !!emp;
            const firstName = emp?.firstName || 'U';
            const lastName = emp?.lastName || '';
            const initials = firstName.charAt(0).toUpperCase();
            const fullName = hasEmpRecord ? `${firstName} ${lastName}` : 'Profile Pending';
            const status = emp?.status || 'No Record';
            const salary = emp?.salary ? `₹${emp.salary.toLocaleString()}` : '₹0';

            return (
              <Card key={userItem._id} style={styles.userCard}>
                <View style={styles.userRow}>
                  {/* Left: Initial Avatar */}
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>{initials}</Text>
                  </View>

                  {/* Middle: Details */}
                  <View style={styles.detailsCol}>
                    <Text style={[styles.empName, !hasEmpRecord && styles.pendingName]}>
                      {fullName}
                    </Text>
                    <Text style={styles.usernameText}>@{userItem.username}</Text>

                    <View style={styles.badgeRow}>
                      {emp?.department ? (
                        <View style={styles.deptBadge}>
                          <Text style={styles.deptBadgeText}>{emp.department}</Text>
                        </View>
                      ) : (
                        <View style={styles.deptBadge}>
                          <Text style={styles.deptBadgeText}>Unassigned</Text>
                        </View>
                      )}

                      <View style={[
                        styles.statusBadge,
                        status === 'Active' ? styles.statusActive : styles.statusInactive
                      ]}>
                        <Text style={[
                          styles.statusBadgeText,
                          status === 'Active' ? styles.statusActiveText : styles.statusInactiveText
                        ]}>
                          {status}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Right: Salary Display */}
                  <View style={styles.salaryCol}>
                    <Text style={styles.salaryLabel}>SALARY</Text>
                    <Text style={styles.salaryText}>{salary}</Text>
                  </View>
                </View>

                {/* Actions Row */}
                <View style={styles.actionBtnRow}>
                  {hasEmpRecord ? (
                    <TouchableOpacity
                      onPress={() => onNavigate('hr-user-edit', { employeeId: emp._id })}
                      style={[styles.btnAction, styles.btnEdit]}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <FontAwesome5 name="edit" size={10} color="#222222" style={{ marginRight: 4 }} />
                        <Text style={styles.btnActionText}>Edit</Text>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <View style={[styles.btnAction, styles.btnDisabled]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <FontAwesome5 name="edit" size={10} color="#717171" style={{ marginRight: 4 }} />
                        <Text style={styles.btnActionTextDisabled}>Edit</Text>
                      </View>
                    </View>
                  )}

                  <TouchableOpacity
                    onPress={() => onNavigate('hr-manage-profile', { userId: userItem._id })}
                    style={[styles.btnAction, styles.btnManage]}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <FontAwesome5 name="id-card" size={10} color="#222222" style={{ marginRight: 4 }} />
                      <Text style={styles.btnActionText}>Manage</Text>
                    </View>
                  </TouchableOpacity>

                  {hasEmpRecord && (
                    <TouchableOpacity
                      onPress={() => handleToggleStatus(emp._id, status, fullName)}
                      disabled={actionLoading === emp._id}
                      style={[
                        styles.btnAction,
                        status === 'Active' ? styles.btnTerminate : styles.btnRestore
                      ]}
                      activeOpacity={0.7}
                    >
                      {actionLoading === emp._id ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <FontAwesome5
                            name={status === 'Active' ? 'ban' : 'check'}
                            size={10}
                            color={status === 'Active' ? '#dc3545' : '#28a745'}
                            style={{ marginRight: 4 }}
                          />
                          <Text style={[
                            styles.btnActionText,
                            status === 'Active' ? styles.btnTerminateText : styles.btnRestoreText
                          ]}>
                            {status === 'Active' ? 'Suspend' : 'Restore'}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  searchInput: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 1,
    marginBottom: 8,
    paddingLeft: 4,
    textTransform: 'uppercase',
  },
  loadingWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 10,
  },
  emptyCard: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
    textAlign: 'center',
  },
  userCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0052cc',
  },
  detailsCol: {
    flex: 1.5,
  },
  empName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  pendingName: {
    color: '#94a3b8',
    fontStyle: 'italic',
    fontWeight: '500',
  },
  usernameText: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#0052cc',
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  deptBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  deptBadgeText: {
    color: '#64748b',
    fontSize: 8,
    fontWeight: '800',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: '#e6fffa',
  },
  statusInactive: {
    backgroundColor: '#fff5f5',
  },
  statusBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  statusActiveText: {
    color: '#047481',
  },
  statusInactiveText: {
    color: '#c53030',
  },
  salaryCol: {
    flex: 0.8,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  salaryLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  salaryText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  actionBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 14,
    paddingTop: 12,
    gap: 6,
  },
  btnAction: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  btnActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  btnEdit: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
  },
  btnManage: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
  },
  btnTerminate: {
    backgroundColor: '#fff5f5',
    borderColor: '#f8d7da',
  },
  btnTerminateText: {
    color: '#dc3545',
  },
  btnRestore: {
    backgroundColor: '#e6fffa',
    borderColor: '#d4edda',
  },
  btnRestoreText: {
    color: '#28a745',
  },
  btnDisabled: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    opacity: 0.5,
  },
  btnActionTextDisabled: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
});
