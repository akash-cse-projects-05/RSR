import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, RefreshControl, FlatList, TouchableOpacity, Platform } from 'react-native';
import Card from '../components/Card';
import Button from '../components/Button';
import Header from '../components/Header';
import { getExpenses, applyExpense, expenseAction } from '../api';
import MapView, { Marker, Callout } from '../components/MapViewShim';
import { FontAwesome5 } from '@expo/vector-icons';

export default function ExpenseScreen({ onBack, user }) {
  const isHR = user.role === 'HR';
  const [expenseList, setExpenseList] = useState([]);
  const [employeesOnMap, setEmployeesOnMap] = useState([]);
  const [mapViewActive, setMapViewActive] = useState(false);
  const [webMapCenter, setWebMapCenter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const mapRef = useRef(null);

  // Apply form (Employee)
  const [type, setType] = useState('Travel');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  // Rejection reason (HR)
  const [rejectionReason, setRejectionReason] = useState({});

  const loadData = async () => {
    try {
      const data = await getExpenses(isHR);
      // For HR, response has pendingExpenses. For employee, it is a direct array of my-expenses.
      setExpenseList(isHR ? data.pendingExpenses || [] : data.expenses || []);
      if (isHR) {
        setEmployeesOnMap(data.employeesOnMap || []);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to retrieve expenses.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApply = async () => {
    if (!amount || !date || !description) {
      Alert.alert('Validation Error', 'All fields are required.');
      return;
    }

    setSubmitLoading(true);
    try {
      // Lat / Lng simulation (simulating office headquarters coords)
      const lat = 12.9716;
      const lng = 77.5946;

      await applyExpense({
        type,
        amount: parseFloat(amount),
        date,
        description,
        lat,
        lng
      });
      Alert.alert('Success', 'Expense claim submitted.');
      // Reset Form
      setAmount('');
      setDate('');
      setDescription('');
      loadData();
    } catch (error) {
      Alert.alert('Failed', error.message || 'Error submitting expense.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleHRAction = async (id, status) => {
    const reason = rejectionReason[id] || '';
    if (status === 'Rejected' && !reason.trim()) {
      Alert.alert('Validation Error', 'Please specify a rejection reason.');
      return;
    }

    try {
      await expenseAction(id, status, reason);
      Alert.alert('Logged', `Claim status changed to ${status}.`);
      loadData();
    } catch (e) {
      Alert.alert('Failed', e.message || 'Error recording decision.');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const renderExpenseItem = ({ item }) => {
    const isPending = item.status === 'Pending';
    const isApproved = item.status === 'Approved';
    const isRejected = item.status === 'Rejected';

    return (
      <Card style={styles.itemCard} accentColor={isApproved ? '#e6fcf5' : isRejected ? '#ffe3e3' : '#fff9db'}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemTitle}>{item.type}</Text>
          <Text style={styles.itemAmount}>₹{item.amount?.toFixed(2)}</Text>
        </View>

        {isHR && (
          <Text style={styles.applicantText}>
            Submitted By: {item.employeeId?.firstName} {item.employeeId?.lastName}
          </Text>
        )}

        <Text style={styles.itemDate}>Date: {item.date ? new Date(item.date).toDateString() : '-'}</Text>
        <Text style={styles.itemDesc}>{item.description}</Text>
        
        {item.rejectionReason ? (
          <Text style={styles.rejectionText}>Reason: {item.rejectionReason}</Text>
        ) : null}

        <View style={styles.statusBadgeRow}>
          <View style={[styles.statusBadge, isApproved ? styles.badgeSuccess : isRejected ? styles.badgeDanger : styles.badgeWarning]}>
            <Text style={[styles.badgeText, isApproved ? styles.textSuccess : isRejected ? styles.textDanger : styles.textWarning]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {isHR && isPending && (
          <View style={styles.hrActionBox}>
            <TextInput
              style={styles.remarkInput}
              value={rejectionReason[item._id] || ''}
              onChangeText={(text) => setRejectionReason({ ...rejectionReason, [item._id]: text })}
              placeholder="Reason (required for rejections)..."
              placeholderTextColor="#94a3b8"
            />
            <View style={styles.hrBtnRow}>
              <Button
                title="Reject"
                type="danger"
                onPress={() => handleHRAction(item._id, 'Rejected')}
                style={styles.actionBtn}
              />
              <Button
                title="Approve"
                type="success"
                onPress={() => handleHRAction(item._id, 'Approved')}
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
        title={isHR ? 'Expense Audits' : 'Reimbursements'}
        subtitle={isHR ? 'Verify and approve claims' : 'Submit receipts and claim repayments'}
        onBack={onBack}
        role={user.role}
      />

      {isHR && (
        <View style={styles.tabToggleRow}>
          <TouchableOpacity
            style={[styles.tabBtn, !mapViewActive && styles.tabBtnActive]}
            onPress={() => setMapViewActive(false)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <FontAwesome5 name="list" size={12} color={!mapViewActive ? "#ffffff" : "#0052cc"} style={{ marginRight: 6 }} />
              <Text style={[styles.tabBtnText, !mapViewActive && styles.tabBtnTextActive]}>Claims Queue</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, mapViewActive && styles.tabBtnActive]}
            onPress={() => setMapViewActive(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <FontAwesome5 name="map-marked-alt" size={12} color={mapViewActive ? "#ffffff" : "#0052cc"} style={{ marginRight: 6 }} />
              <Text style={[styles.tabBtnText, mapViewActive && styles.tabBtnTextActive]}>Employee Map</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {isHR && mapViewActive ? (
          <View>
            <Card style={styles.mapCard}>
              <View style={styles.mapWrapper}>
                {Platform.OS === 'web' ? (
                  <iframe
                    srcDoc={`
                      <!DOCTYPE html>
                      <html>
                      <head>
                        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
                        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                        <style>
                          #map { height: 100vh; margin: 0; }
                        </style>
                      </head>
                      <body>
                        <div id="map"></div>
                        <script>
                          const map = L.map('map').setView([${webMapCenter ? `${webMapCenter.lat}, ${webMapCenter.lng}` : '20.5937, 78.9629'}], ${webMapCenter ? '12' : '4'});
                          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                            attribution: '&copy; OpenStreetMap'
                          }).addTo(map);

                          const employees = ${JSON.stringify(employeesOnMap)};
                          employees.forEach(emp => {
                            if(emp.lastKnownLocation && emp.lastKnownLocation.lat) {
                              const marker = L.marker([emp.lastKnownLocation.lat, emp.lastKnownLocation.lng]).addTo(map);
                              marker.bindPopup("<b>" + emp.firstName + " " + emp.lastName + "</b><br/>" + emp.designation + " (" + emp.department + ")<br/>Seen: " + new Date(emp.lastKnownLocation.timestamp).toLocaleString());
                            }
                          });
                        </script>
                      </body>
                      </html>
                    `}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                  />
                ) : (
                  <MapView
                    ref={mapRef}
                    style={styles.map}
                    initialRegion={{
                      latitude: 20.5937,
                      longitude: 78.9629,
                      latitudeDelta: 15,
                      longitudeDelta: 15,
                    }}
                  >
                    {employeesOnMap.map((emp) => {
                      if (emp.lastKnownLocation && emp.lastKnownLocation.lat) {
                        return (
                          <Marker
                            key={emp._id}
                            coordinate={{
                              latitude: emp.lastKnownLocation.lat,
                              longitude: emp.lastKnownLocation.lng,
                            }}
                            pinColor="#0052cc"
                          >
                            <Callout>
                              <View style={styles.calloutBox}>
                                <Text style={styles.calloutName}>{emp.firstName} {emp.lastName}</Text>
                                <Text style={styles.calloutSub}>{emp.designation} ({emp.department})</Text>
                                <Text style={styles.calloutTime}>
                                  Seen: {new Date(emp.lastKnownLocation.timestamp).toLocaleString()}
                                </Text>
                              </View>
                            </Callout>
                          </Marker>
                        );
                      }
                      return null;
                    })}
                  </MapView>
                )}
              </View>
              <View style={styles.mapFooter}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <FontAwesome5 name="info-circle" size={11} color="#5e6c84" style={{ marginRight: 6 }} />
                  <Text style={styles.mapFooterText}>
                    Showing last known locations of field staff (Checked-in within last 24h).
                  </Text>
                </View>
              </View>
            </Card>

            <Text style={styles.sectionTitle}>Active Field Agents</Text>
            {employeesOnMap.filter(emp => emp.lastKnownLocation && emp.lastKnownLocation.lat).length === 0 ? (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyText}>No active field agents found on map.</Text>
              </Card>
            ) : (
              <View style={styles.agentsScrollerContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.agentsScroller}>
                  {employeesOnMap.map((emp) => {
                    if (!emp.lastKnownLocation || !emp.lastKnownLocation.lat) return null;
                    return (
                      <TouchableOpacity
                        key={emp._id}
                        style={styles.agentCard}
                        onPress={() => {
                          if (Platform.OS === 'web') {
                            setWebMapCenter({ lat: emp.lastKnownLocation.lat, lng: emp.lastKnownLocation.lng });
                          } else {
                            mapRef.current?.animateToRegion({
                              latitude: emp.lastKnownLocation.lat,
                              longitude: emp.lastKnownLocation.lng,
                              latitudeDelta: 0.01,
                              longitudeDelta: 0.01,
                            }, 1000);
                          }
                        }}
                      >
                        <View style={styles.agentAvatar}>
                          <Text style={styles.avatarText}>{emp.firstName.charAt(0)}</Text>
                        </View>
                        <View>
                          <Text style={styles.agentName}>{emp.firstName} {emp.lastName.charAt(0)}.</Text>
                          <Text style={styles.agentTime}>
                            {new Date(emp.lastKnownLocation.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>
        ) : (
          <View>
            {/* Claim Submission Form */}
            {!isHR && (
              <Card style={styles.formCard}>
                <Text style={styles.sectionTitle}>New Expense Claim</Text>
                
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Category</Text>
                  <TextInput
                    style={styles.input}
                    value={type}
                    onChangeText={setType}
                    placeholder="Travel, Food, Lodging, Others"
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <View style={styles.rowInputs}>
                  <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.label}>Amount (₹)</Text>
                    <TextInput
                      style={styles.input}
                      value={amount}
                      onChangeText={setAmount}
                      keyboardType="numeric"
                      placeholder="0.00"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                  <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.label}>Date</Text>
                    <TextInput
                      style={styles.input}
                      value={date}
                      onChangeText={setDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Details / Description</Text>
                  <TextInput
                    style={[styles.input, styles.multiline]}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={3}
                    placeholder="Enter details of transaction"
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <Button
                  title="Submit Claim"
                  onPress={handleApply}
                  loading={submitLoading}
                />
              </Card>
            )}

            {/* Expenses List */}
            <Text style={styles.sectionTitle}>{isHR ? 'Pending Claims Queue' : 'My Past Claims'}</Text>
            {expenseList.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyText}>No claims found.</Text>
              </Card>
            ) : (
              <FlatList
                data={expenseList}
                renderItem={renderExpenseItem}
                keyExtractor={(item) => item._id}
                scrollEnabled={false}
              />
            )}
          </View>
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
  itemAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0052cc',
  },
  applicantText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0052cc',
    marginBottom: 4,
  },
  itemDate: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  itemDesc: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 6,
  },
  rejectionText: {
    fontSize: 12,
    color: '#dc3545',
    fontWeight: '600',
    marginBottom: 6,
  },
  statusBadgeRow: {
    alignItems: 'flex-start',
    marginTop: 4,
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
  hrActionBox: {
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 12,
    paddingTop: 12,
  },
  remarkInput: {
    backgroundColor: '#ffffff',
    color: '#0f172a',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    fontWeight: '600',
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
  tabToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1.5,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#0052cc',
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0052cc',
  },
  tabBtnTextActive: {
    color: '#ffffff',
  },
  mapCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: 16,
  },
  mapWrapper: {
    height: 320,
    width: '100%',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapFooter: {
    padding: 12,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  mapFooterText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  agentsScrollerContainer: {
    marginBottom: 20,
  },
  agentsScroller: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  agentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 10,
    marginRight: 10,
    minWidth: 180,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  agentAvatar: {
    width: 32,
    height: 32,
    backgroundColor: '#e6f0ff',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0052cc',
  },
  agentName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  agentTime: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 2,
  },
  calloutBox: {
    width: 180,
    padding: 6,
  },
  calloutName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0052cc',
    marginBottom: 2,
  },
  calloutSub: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  calloutTime: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    fontStyle: 'italic',
  },
});
