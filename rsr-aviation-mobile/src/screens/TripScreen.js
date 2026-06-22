import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, RefreshControl, FlatList, TouchableOpacity, Modal, Platform } from 'react-native';
import Card from '../components/Card';
import Button from '../components/Button';
import Header from '../components/Header';
import { getTrips, requestTrip, startTrip, endTrip, startTripDay, endTripDay, logTripActivity, getTripTrack, updateTripLog } from '../api';
import MapView, { Marker, Polyline, Callout } from '../components/MapViewShim';
import * as Location from 'expo-location';
import { FontAwesome5 } from '@expo/vector-icons';

export default function TripScreen({ onBack, user }) {
  const isHR = user.role === 'HR';
  const [tripsList, setTripsList] = useState([]);
  const [activeTrips, setActiveTrips] = useState([]);
  const [completedTrips, setCompletedTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // request/map selections
  const [selectedTripForMap, setSelectedTripForMap] = useState(null);
  const [mapDetails, setMapDetails] = useState(null);
  const [mapDetailsOwner, setMapDetailsOwner] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);
  const [editLogModalVisible, setEditLogModalVisible] = useState(false);
  const [editingLogId, setEditingLogId] = useState('');
  const [editTasksDone, setEditTasksDone] = useState('');
  const [endDayModalVisible, setEndDayModalVisible] = useState(false);
  const [endDayTasks, setEndDayTasks] = useState('');
  const [endDayTripId, setEndDayTripId] = useState('');

  const mapRef = useRef(null);

  // Request form (Employee)
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [purpose, setPurpose] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  // Active tracking state (Employee)
  const [actionLoading, setActionLoading] = useState(false);
  const [activityNote, setActivityNote] = useState('');

  const loadData = async () => {
    try {
      const data = await getTrips(isHR);
      if (isHR) {
        setTripsList(data.pendingTrips || []);
        setActiveTrips(data.activeTrips || []);
        setCompletedTrips(data.completedTrips || []);
      } else {
        setTripsList(data.trips || []);
      }
      
      // If we are currently viewing a trip route map, refresh its details
      if (selectedTripForMap) {
        const trackData = await getTripTrack(selectedTripForMap);
        setMapDetails(trackData.trip);
        setMapDetailsOwner(trackData.isOwner);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to retrieve trip records.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchTripTrack = async (id) => {
    setMapLoading(true);
    try {
      const res = await getTripTrack(id);
      setMapDetails(res.trip);
      setMapDetailsOwner(res.isOwner);
      setSelectedTripForMap(id);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to retrieve trip route details.');
    } finally {
      setMapLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Please grant location permissions to update trip telemetry.');
      return false;
    }
    return true;
  };

  const handleRequest = async () => {
    if (!source || !destination || !purpose || !startDate || !endDate) {
      Alert.alert('Validation Error', 'All request details are required.');
      return;
    }

    setSubmitLoading(true);
    try {
      let destLat = 13.0827; // Default fallback
      let destLng = 80.2707;
      try {
        const geocoded = await Location.geocodeAsync(destination);
        if (geocoded && geocoded.length > 0) {
          destLat = geocoded[0].latitude;
          destLng = geocoded[0].longitude;
        }
      } catch (err) {
        console.log("Geocoding destination failed: ", err);
      }

      await requestTrip({
        source,
        destination,
        purpose,
        startDate,
        endDate,
        destLat,
        destLng
      });
      Alert.alert('Success', 'Trip request logged.');
      setSource('');
      setDestination('');
      setPurpose('');
      setStartDate('');
      setEndDate('');
      loadData();
    } catch (e) {
      Alert.alert('Request Failed', e.message || 'Error creating trip request.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const executeStartTrip = async (id) => {
    setActionLoading(true);
    try {
      const hasPerm = await requestLocationPermission();
      if (!hasPerm) { setActionLoading(false); return; }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await startTrip(id, loc.coords.latitude, loc.coords.longitude);
      Alert.alert('Trip Started', 'Field log is now ACTIVE.');
      loadData();
    } catch (e) {
      Alert.alert('Failed', e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const executeEndTrip = async (id) => {
    setActionLoading(true);
    try {
      await endTrip(id);
      Alert.alert('Trip Completed', 'Trip marked as completed.');
      loadData();
    } catch (e) {
      Alert.alert('Failed', e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const executeStartDay = async (id) => {
    setActionLoading(true);
    try {
      const hasPerm = await requestLocationPermission();
      if (!hasPerm) { setActionLoading(false); return; }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      let address = 'Trip Day Start Point';
      try {
        const geo = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        if (geo && geo.length > 0) {
          address = `${geo[0].street || ''}, ${geo[0].city || ''}`;
        }
      } catch (err) {}

      await startTripDay(id, loc.coords.latitude, loc.coords.longitude, address);
      Alert.alert('Day Started', 'Telemetry recording started for today.');
      loadData();
    } catch (e) {
      Alert.alert('Failed', e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const executeEndDay = (id) => {
    setEndDayTripId(id);
    setEndDayTasks('');
    setEndDayModalVisible(true);
  };

  const handleEndDaySubmit = async () => {
    if (!endDayTasks.trim()) {
      Alert.alert('Validation Error', 'Please specify tasks completed today.');
      return;
    }

    setEndDayModalVisible(false);
    setActionLoading(true);
    try {
      const hasPerm = await requestLocationPermission();
      if (!hasPerm) { setActionLoading(false); return; }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      let address = 'Trip Day End Point';
      try {
        const geo = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        if (geo && geo.length > 0) {
          address = `${geo[0].street || ''}, ${geo[0].city || ''}`;
        }
      } catch (err) {}

      await endTripDay(endDayTripId, loc.coords.latitude, loc.coords.longitude, address, endDayTasks);
      Alert.alert('Day Closed', 'Today\'s activity closed.');
      loadData();
    } catch (e) {
      Alert.alert('Failed', e.message);
    } finally {
      setActionLoading(false);
      setEndDayTasks('');
      setEndDayTripId('');
    }
  };

  const executeLogActivity = async (id) => {
    if (!activityNote.trim()) {
      Alert.alert('Error', 'Please enter an activity note.');
      return;
    }
    setActionLoading(true);
    try {
      const hasPerm = await requestLocationPermission();
      if (!hasPerm) { setActionLoading(false); return; }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      let address = 'Enroute waypoint';
      try {
        const geo = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        if (geo && geo.length > 0) {
          address = `${geo[0].street || ''}, ${geo[0].city || ''}`;
        }
      } catch (err) {}

      await logTripActivity(id, loc.coords.latitude, loc.coords.longitude, activityNote, address);
      Alert.alert('Logged', 'Activity note recorded on map.');
      setActivityNote('');
      loadData();
    } catch (e) {
      Alert.alert('Failed', e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleEditLogSubmit = async () => {
    if (!editTasksDone.trim()) {
      Alert.alert('Validation Error', 'Please describe tasks completed.');
      return;
    }

    setEditLogModalVisible(false);
    setActionLoading(true);
    try {
      await updateTripLog(selectedTripForMap, editingLogId, editTasksDone);
      Alert.alert('Success', 'Daily log description updated.');
      loadData();
    } catch (e) {
      Alert.alert('Failed', e.message);
    } finally {
      setActionLoading(false);
      setEditingLogId('');
      setEditTasksDone('');
    }
  };

  const renderTripItem = ({ item }) => {
    const isPending = item.status === 'Pending';
    const isApproved = item.status === 'Approved';
    const isInProgress = item.status === 'In Progress';
    const isCompleted = item.status === 'Completed';

    return (
      <Card style={styles.itemCard} accentColor={isCompleted ? '#e6fcf5' : isPending ? '#fff9db' : '#e3fafc'}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemTitle}>{item.source} to {item.destination}</Text>
          <View style={[styles.statusBadge, isCompleted ? styles.badgeSuccess : isPending ? styles.badgeWarning : styles.badgeInfo]}>
            <Text style={styles.badgeText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>

        {isHR && (
          <Text style={styles.applicantText}>
            Pilot/Personnel: {item.employeeId?.firstName} {item.employeeId?.lastName}
          </Text>
        )}

        <Text style={styles.itemDates}>
          Timeline: {item.startDate ? new Date(item.startDate).toLocaleDateString() : '-'} to {item.endDate ? new Date(item.endDate).toLocaleDateString() : '-'}
        </Text>
        <Text style={styles.itemPurpose}>Purpose: {item.purpose}</Text>

        {/* Active Trip control buttons for employee */}
        {!isHR && (isApproved || isInProgress) && (
          <View style={styles.controlBox}>
            <Text style={styles.consoleTitle}>Trip Telemetry Console</Text>
            {isApproved && (
              <Button
                title="START TRIP MONITORING"
                type="success"
                loading={actionLoading}
                onPress={() => executeStartTrip(item._id)}
                icon={<FontAwesome5 name="play" size={12} color="#ffffff" />}
              />
            )}
            {isInProgress && (
              <View>
                <View style={styles.btnRow}>
                  <Button
                    title="Start Day"
                    type="primary"
                    loading={actionLoading}
                    onPress={() => executeStartDay(item._id)}
                    style={styles.halfBtn}
                    icon={<FontAwesome5 name="sun" size={14} color="#ffffff" />}
                  />
                  <Button
                    title="End Day"
                    type="warning"
                    loading={actionLoading}
                    onPress={() => executeEndDay(item._id)}
                    style={styles.halfBtn}
                    icon={<FontAwesome5 name="moon" size={14} color="#ffffff" />}
                  />
                </View>
                
                <TextInput
                  style={styles.noteInput}
                  value={activityNote}
                  onChangeText={setActivityNote}
                  placeholder="Type en-route activity note..."
                  placeholderTextColor="#94a3b8"
                />
                <Button
                  title="Log Custom Activity"
                  type="secondary"
                  loading={actionLoading}
                  onPress={() => executeLogActivity(item._id)}
                  icon={<FontAwesome5 name="pen" size={12} color="#0052cc" />}
                />
                
                <Button
                  title="END TRIP"
                  type="danger"
                  loading={actionLoading}
                  onPress={() => executeEndTrip(item._id)}
                  style={styles.stopBtn}
                  icon={<FontAwesome5 name="stop" size={12} color="#ffffff" />}
                />
              </View>
            )}
          </View>
        )}

        {(isInProgress || isCompleted) && (
          <Button
            title="VIEW ROUTE MAP"
            type="secondary"
            onPress={() => fetchTripTrack(item._id)}
            style={styles.viewRouteBtn}
            icon={<FontAwesome5 name="map-marked-alt" size={12} color="#0052cc" />}
          />
        )}
      </Card>
    );
  };

  if (selectedTripForMap && mapDetails) {
    const locations = mapDetails.locations || [];
    const actualCoordinates = locations.map(l => ({ latitude: l.lat, longitude: l.lng }));
    
    let initialRegion = {
      latitude: 20.5937,
      longitude: 78.9629,
      latitudeDelta: 10,
      longitudeDelta: 10
    };
    
    if (locations.length > 0) {
      initialRegion = {
        latitude: locations[0].lat,
        longitude: locations[0].lng,
        latitudeDelta: 0.2,
        longitudeDelta: 0.2
      };
    }
    
    return (
      <View style={styles.container}>
        <Header
          title="Route Path Tracking"
          subtitle={`${mapDetails.source} to ${mapDetails.destination}`}
          onBack={() => {
            setSelectedTripForMap(null);
            setMapDetails(null);
            setMapDetailsOwner(false);
          }}
          role={user.role}
        />
        
        {/* Statistics panel */}
        <View style={styles.infoPanel}>
          <View style={styles.infoRow}>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>PILOT / CREW</Text>
              <Text style={styles.infoVal}>
                {mapDetails.employeeId?.firstName} {mapDetails.employeeId?.lastName}
              </Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>WAYPOINT CHECKS</Text>
              <Text style={styles.infoVal}>{locations.length} Locations</Text>
            </View>
          </View>
        </View>

        {/* The map */}
        <View style={styles.routeMapWrapper}>
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
                    const locations = ${JSON.stringify(locations)};
                    let center = [20.5937, 78.9629];
                    let zoom = 5;

                    if (locations.length > 0) {
                      center = [locations[0].lat, locations[0].lng];
                      zoom = 10;
                    }

                    const map = L.map('map').setView(center, zoom);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                      attribution: '&copy; OpenStreetMap'
                    }).addTo(map);

                    const pathCoords = [];
                    locations.forEach(loc => {
                      pathCoords.push([loc.lat, loc.lng]);

                      if (loc.type !== 'Ping' && loc.type !== 'AutoArrival') {
                        let title = loc.type;
                        if (loc.type === 'StartTrip') {
                          title = 'Trip Start Point';
                        } else if (loc.type === 'Activity') {
                          title = 'Activity: ' + (loc.note || '');
                        }

                        const marker = L.marker([loc.lat, loc.lng]).addTo(map);
                        marker.bindPopup("<b>" + title + "</b><br/>" + new Date(loc.timestamp).toLocaleString());
                      }
                    });

                    if (pathCoords.length > 0) {
                      const polyline = L.polyline(pathCoords, {color: '#0052cc', weight: 4}).addTo(map);
                      map.fitBounds(polyline.getBounds());
                    }
                  </script>
                </body>
                </html>
              `}
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          ) : (
            <MapView
              ref={mapRef}
              style={styles.routeMap}
              initialRegion={initialRegion}
            >
              {actualCoordinates.length > 0 && (
                <Polyline
                  coordinates={actualCoordinates}
                  strokeColor="#0052cc"
                  strokeWidth={4}
                />
              )}
              
              {locations.map((loc, idx) => {
                if (loc.type === 'Ping' || loc.type === 'AutoArrival') return null;
                
                let markerColor = '#0052cc'; // Default waypoint
                let title = loc.type;
                
                if (loc.type === 'StartTrip') {
                  markerColor = '#28a745'; // Green
                  title = 'Trip Start Point';
                } else if (loc.type === 'Activity') {
                  markerColor = '#ffc107'; // Yellow/Orange
                  title = `Activity: ${loc.note || ''}`;
                }
                
                return (
                  <Marker
                    key={loc._id || idx}
                    coordinate={{ latitude: loc.lat, longitude: loc.lng }}
                    pinColor={markerColor}
                    title={title}
                    description={new Date(loc.timestamp).toLocaleString()}
                  />
                );
              })}
            </MapView>
          )}
        </View>

        {/* Daily Logs list */}
        <Text style={styles.sectionTitle}>Daily Logs & Tasks</Text>
        <ScrollView style={styles.logsListContainer}>
          {(!mapDetails.dailyLogs || mapDetails.dailyLogs.length === 0) ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>No daily logs logged for this trip.</Text>
            </Card>
          ) : (
            mapDetails.dailyLogs.map((log) => (
              <Card key={log._id} style={styles.logCard}>
                <View style={styles.logHeader}>
                  <Text style={styles.logDate}>{log.date}</Text>
                  <Text style={[styles.logStatusText, log.status === 'Completed' ? styles.greenText : styles.yellowText]}>
                    {log.status.toUpperCase()}
                  </Text>
                </View>
                
                <View style={styles.logBody}>
                  <View style={styles.logRow}>
                    <Text style={styles.logLabelSmall}>Start Location:</Text>
                    <Text style={styles.logValSmall}>
                      {log.startLocation?.address || 'Unknown'} {log.startTime && `(${new Date(log.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})`}
                    </Text>
                  </View>
                  <View style={styles.logRow}>
                    <Text style={styles.logLabelSmall}>End Location:</Text>
                    <Text style={styles.logValSmall}>
                      {log.endLocation?.address || 'Unknown'} {log.endTime && `(${new Date(log.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})`}
                    </Text>
                  </View>
                  <View style={[styles.logRow, { borderTopWidth: 1, borderTopColor: '#ebebeb', paddingTop: 8, marginTop: 8 }]}>
                    <Text style={styles.logLabelSmall}>Work Done:</Text>
                    <Text style={styles.logValTasks}>{log.tasksDone || 'No description provided'}</Text>
                  </View>
                </View>

                {mapDetailsOwner && (
                  <TouchableOpacity
                    style={styles.editLogBtn}
                    onPress={() => {
                      setEditingLogId(log._id);
                      setEditTasksDone(log.tasksDone || '');
                      setEditLogModalVisible(true);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                      <FontAwesome5 name="edit" size={12} color="#0052cc" style={{ marginRight: 6 }} />
                      <Text style={styles.editLogBtnText}>Edit Work Description</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </Card>
            ))
          )}
        </ScrollView>

        {/* Edit Log Modal */}
        <Modal
          visible={editLogModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setEditLogModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Work Description</Text>
              <Text style={styles.modalSubtitle}>Describe tasks completed during this log:</Text>
              
              <TextInput
                style={styles.modalInput}
                value={editTasksDone}
                onChangeText={setEditTasksDone}
                placeholder="E.g. Hangar testing, aircraft checks..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={4}
              />

              <View style={styles.modalButtons}>
                <Button
                  title="Cancel"
                  type="secondary"
                  onPress={() => {
                    setEditLogModalVisible(false);
                    setEditingLogId('');
                    setEditTasksDone('');
                  }}
                  style={styles.modalBtn}
                />
                <Button
                  title="Save Changes"
                  type="primary"
                  onPress={handleEditLogSubmit}
                  style={styles.modalBtn}
                />
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title={isHR ? 'Field Operations' : 'Trip Management'}
        subtitle={isHR ? 'Track flight crew routes and schedules' : 'Book trip routes and report telemetry'}
        onBack={onBack}
        role={user.role}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Request Form (Employee) */}
        {!isHR && (
          <Card style={styles.formCard}>
            <Text style={styles.sectionTitle}>Request Field Trip</Text>
            
            <View style={styles.rowInputs}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Origin</Text>
                <TextInput
                  style={styles.input}
                  value={source}
                  onChangeText={setSource}
                  placeholder="e.g. Bangalore"
                  placeholderTextColor="#94a3b8"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Destination</Text>
                <TextInput
                  style={styles.input}
                  value={destination}
                  onChangeText={setDestination}
                  placeholder="e.g. Chennai"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            <View style={styles.rowInputs}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Start Date</Text>
                <TextInput
                  style={styles.input}
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94a3b8"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>End Date</Text>
                <TextInput
                  style={styles.input}
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Purpose / Flight Mission</Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                value={purpose}
                onChangeText={setPurpose}
                multiline
                numberOfLines={3}
                placeholder="Mission details and route outline..."
                placeholderTextColor="#94a3b8"
              />
            </View>

            <Button
              title="Request Trip"
              onPress={handleRequest}
              loading={submitLoading}
            />
          </Card>
        )}

        {/* Trip Queue Logs */}
        {isHR ? (
          <View>
            <Text style={styles.sectionTitle}>Pending Authorizations</Text>
            {tripsList.length === 0 ? (
              <Card style={styles.emptyCard}><Text style={styles.emptyText}>No pending trip approvals.</Text></Card>
            ) : (
              <FlatList data={tripsList} renderItem={renderTripItem} keyExtractor={(item) => item._id} scrollEnabled={false} />
            )}

            <Text style={styles.sectionTitle}>Active Field Missions</Text>
            {activeTrips.length === 0 ? (
              <Card style={styles.emptyCard}><Text style={styles.emptyText}>No active trips currently.</Text></Card>
            ) : (
              <FlatList data={activeTrips} renderItem={renderTripItem} keyExtractor={(item) => item._id} scrollEnabled={false} />
            )}

            <Text style={styles.sectionTitle}>Historical Log</Text>
            {completedTrips.length === 0 ? (
              <Card style={styles.emptyCard}><Text style={styles.emptyText}>No completed trips logged.</Text></Card>
            ) : (
              <FlatList data={completedTrips} renderItem={renderTripItem} keyExtractor={(item) => item._id} scrollEnabled={false} />
            )}
          </View>
        ) : (
          <View>
            <Text style={styles.sectionTitle}>My Trip Folders</Text>
            {tripsList.length === 0 ? (
              <Card style={styles.emptyCard}><Text style={styles.emptyText}>No trip folders created yet.</Text></Card>
            ) : (
              <FlatList data={tripsList} renderItem={renderTripItem} keyExtractor={(item) => item._id} scrollEnabled={false} />
            )}
          </View>
        )}
      </ScrollView>

      {/* End Day Modal */}
      <Modal
        visible={endDayModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setEndDayModalVisible(false);
          setEndDayTripId('');
          setEndDayTasks('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>End Trip Day Session</Text>
            <Text style={styles.modalSubtitle}>Please describe the tasks completed today:</Text>
            
            <TextInput
              style={styles.modalInput}
              value={endDayTasks}
              onChangeText={setEndDayTasks}
              placeholder="Describe tasks completed today..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={4}
            />

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                type="secondary"
                onPress={() => {
                  setEndDayModalVisible(false);
                  setEndDayTripId('');
                  setEndDayTasks('');
                }}
                style={styles.modalBtn}
              />
              <Button
                title="End Day"
                type="primary"
                onPress={handleEndDaySubmit}
                style={styles.modalBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  formCard: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#091e42',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    color: '#091e42',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#ffffff',
    color: '#091e42',
    borderWidth: 1,
    borderColor: '#ebebeb',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
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
    fontSize: 15,
    fontWeight: '800',
    color: '#091e42',
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#fff9db',
  },
  badgeSuccess: {
    backgroundColor: '#e6fcf5',
  },
  badgeWarning: {
    backgroundColor: '#fff9db',
  },
  badgeInfo: {
    backgroundColor: '#e3fafc',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#091e42',
  },
  applicantText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0052cc',
    marginBottom: 4,
  },
  itemDates: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5e6c84',
    marginBottom: 4,
  },
  itemPurpose: {
    fontSize: 12,
    color: '#091e42',
    marginBottom: 6,
  },
  controlBox: {
    borderTopWidth: 1,
    borderColor: '#ebebeb',
    marginTop: 12,
    paddingTop: 12,
  },
  consoleTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#f08c00',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfBtn: {
    width: '48%',
    paddingVertical: 10,
  },
  noteInput: {
    backgroundColor: '#f8fafc',
    color: '#091e42',
    borderWidth: 1,
    borderColor: '#ebebeb',
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    marginVertical: 10,
  },
  stopBtn: {
    marginTop: 12,
    paddingVertical: 12,
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#5e6c84',
    fontSize: 13,
    fontWeight: '600',
  },
  viewRouteBtn: {
    marginVertical: 8,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#0052cc',
  },
  infoPanel: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: '#ebebeb',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoCol: {
    flex: 1,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 9,
    fontWeight: '850',
    color: '#717171',
    marginBottom: 4,
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0052cc',
  },
  routeMapWrapper: {
    height: 300,
    width: '100%',
  },
  routeMap: {
    ...StyleSheet.absoluteFillObject,
  },
  logsListContainer: {
    flex: 1,
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  logCard: {
    marginVertical: 6,
    padding: 14,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#ebebeb',
    paddingBottom: 8,
    marginBottom: 8,
  },
  logDate: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0052cc',
  },
  logStatusText: {
    fontSize: 10,
    fontWeight: '850',
  },
  greenText: {
    color: '#28a745',
  },
  yellowText: {
    color: '#f08c00',
  },
  logBody: {
    gap: 6,
  },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  logLabelSmall: {
    fontSize: 10,
    fontWeight: '800',
    color: '#717171',
    width: '30%',
  },
  logValSmall: {
    fontSize: 10,
    color: '#091e42',
    fontWeight: '600',
    width: '70%',
    textAlign: 'right',
  },
  logValTasks: {
    fontSize: 11,
    color: '#091e42',
    fontWeight: '700',
    width: '70%',
    textAlign: 'right',
  },
  editLogBtn: {
    marginTop: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#0052cc',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editLogBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0052cc',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0052cc',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#717171',
    fontWeight: '600',
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#0052cc',
    textAlignVertical: 'top',
    height: 100,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalBtn: {
    width: '48%',
    paddingVertical: 12,
  },
});
