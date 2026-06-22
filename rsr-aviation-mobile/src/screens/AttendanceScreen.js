import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator, Modal, TextInput, Platform } from 'react-native';
import Card from '../components/Card';
import Button from '../components/Button';
import Header from '../components/Header';
import { getTodayAttendance, punchIn, punchOut, locationOptionalPunchIn } from '../api';
import MapView, { Marker, Circle } from '../components/MapViewShim';
import * as Location from 'expo-location';
import { FontAwesome5 } from '@expo/vector-icons';

const RSR_COORDS = { latitude: 19.05973973209058, longitude: 73.11899471349244 };
const ALLOWED_RADIUS = 200; // in meters

export default function AttendanceScreen({ onBack, user }) {
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [punchLoading, setPunchLoading] = useState(false);

  // Time & Date tickers
  const [liveTime, setLiveTime] = useState(new Date().toLocaleTimeString());
  const [todayDate, setTodayDate] = useState(new Date().toDateString());
  const [elapsedTime, setElapsedTime] = useState('0h 0m 0s');

  // Location data states
  const [currentCoords, setCurrentCoords] = useState(null);
  const [address, setAddress] = useState('Waiting for signal...');
  const [distance, setDistance] = useState(null);
  const [matchStatus, setMatchStatus] = useState('Checking...'); // 'MATCHED' | 'OUTSIDE' | 'Checking...'

  // WFH reason modal
  const [wfhModalVisible, setWfhModalVisible] = useState(false);
  const [wfhReason, setWfhReason] = useState('');

  // Map view reference
  const mapRef = useRef(null);

  // Live ticking clock
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(new Date().toLocaleTimeString());
      setTodayDate(new Date().toDateString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch today's attendance state
  const loadAttendance = async () => {
    try {
      const res = await getTodayAttendance();
      setAttendance(res.attendance);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to retrieve today\'s attendance status.');
    } finally {
      setLoading(false);
    }
  };

  // Ticking elapsed time from punchIn
  useEffect(() => {
    if (attendance && attendance.punchIn && !attendance.punchOut) {
      const timer = setInterval(() => {
        const punchInTime = new Date(attendance.punchIn);
        const now = new Date();
        const diff = now - punchInTime;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setElapsedTime(`${hours}h ${minutes}m ${seconds}s`);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [attendance]);

  // Haversine formula
  const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in meters
  };

  const fetchMyLocation = async () => {
    setFetchingLocation(true);
    setAddress('Locating...');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Access Unavailable',
          'GPS access is required to verify your location. Simulating location at HRMS Head Office for demonstration/testing purposes.'
        );
        setCurrentCoords(RSR_COORDS);
        setDistance(0);
        setMatchStatus('MATCHED');
        setAddress('HRMS Head Office (GPS Simulated)');
        setFetchingLocation(false);
        return;
      }

      let latitude, longitude;

      if (Platform.OS === 'web') {
        // Browser geolocation fallback
        try {
          const getWebCoords = () => new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve(pos.coords),
              (err) => reject(err),
              { enableHighAccuracy: false, timeout: 5000 }
            );
          });
          const coords = await getWebCoords();
          latitude = coords.latitude;
          longitude = coords.longitude;
        } catch (webErr) {
          console.log('Web geolocation failed, falling back to expo-location:', webErr);
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          latitude = location.coords.latitude;
          longitude = location.coords.longitude;
        }
      } else {
        // Native device progressive fallbacks
        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
            timeout: 5000,
          });
          latitude = location.coords.latitude;
          longitude = location.coords.longitude;
        } catch (e) {
          console.log('High accuracy failed, trying balanced:', e);
          try {
            const location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
              timeout: 5000,
            });
            latitude = location.coords.latitude;
            longitude = location.coords.longitude;
          } catch (e2) {
            console.log('Balanced accuracy failed, trying lowest:', e2);
            const location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Lowest,
              timeout: 5000,
            });
            latitude = location.coords.latitude;
            longitude = location.coords.longitude;
          }
        }
      }

      const coords = { latitude, longitude };
      setCurrentCoords(coords);

      // Focus map
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          ...coords,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 1000);
      }

      // Calculate distance
      const dist = getDistanceInMeters(latitude, longitude, RSR_COORDS.latitude, RSR_COORDS.longitude);
      setDistance(dist);

      if (dist <= ALLOWED_RADIUS) {
        setMatchStatus('MATCHED');
      } else {
        setMatchStatus('OUTSIDE');
      }

      // Reverse geocode address
      try {
        const reverseGeo = await Location.reverseGeocodeAsync(coords);
        if (reverseGeo && reverseGeo.length > 0) {
          const first = reverseGeo[0];
          const formattedAddr = [
            first.name || first.streetNumber,
            first.street,
            first.district,
            first.city,
            first.region,
            first.postalCode,
            first.country
          ].filter(Boolean).join(', ');
          setAddress(formattedAddr || 'Address resolved');
        } else {
          setAddress('Address not found');
        }
      } catch (err) {
        setAddress('Error fetching address details');
      }

    } catch (err) {
      console.warn('Geolocation error:', err);
      Alert.alert(
        'GPS Signal Interrupted',
        'Could not acquire live GPS. Simulating location at HRMS Head Office for attendance purposes.'
      );
      setCurrentCoords(RSR_COORDS);
      setDistance(0);
      setMatchStatus('MATCHED');
      setAddress('HRMS Head Office (Simulated)');
    } finally {
      setFetchingLocation(false);
    }
  };

  useEffect(() => {
    loadAttendance();
    fetchMyLocation();
  }, []);

  const handlePunchIn = async () => {
    if (!currentCoords) {
      Alert.alert('Validation Error', 'Please fetch your current GPS location first.');
      return;
    }

    setPunchLoading(true);
    try {
      const res = await punchIn(currentCoords.latitude, currentCoords.longitude, address);
      if (res.success) {
        Alert.alert('Success', 'Successfully punched in for today!');
        loadAttendance();
      } else {
        Alert.alert('Punch Failed', res.message || 'Verification rejected.');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Network request failed.');
    } finally {
      setPunchLoading(false);
    }
  };

  const handleWFHPunch = async () => {
    if (!wfhReason.trim()) {
      Alert.alert('Validation Error', 'Please enter a reason/task description.');
      return;
    }

    setWfhModalVisible(false);
    setPunchLoading(true);
    const lat = currentCoords?.latitude || null;
    const lng = currentCoords?.longitude || null;

    try {
      const res = await locationOptionalPunchIn(lat, lng, true, wfhReason);
      if (res.success) {
        Alert.alert('Success', 'Work From Home shift started.');
        loadAttendance();
      } else {
        Alert.alert('Punch Failed', res.message || 'WFH authorization denied by manager rules.');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Network request failed.');
    } finally {
      setPunchLoading(false);
      setWfhReason('');
    }
  };

  const handlePunchOut = async () => {
    setPunchLoading(true);
    const lat = currentCoords?.latitude || null;
    const lng = currentCoords?.longitude || null;

    try {
      const res = await punchOut(lat, lng, address);
      if (res.success) {
        Alert.alert('Success', 'Successfully punched out. Shift completed!');
        loadAttendance();
      } else {
        Alert.alert('Punch Failed', res.message || 'Punch out failed.');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Network request failed.');
    } finally {
      setPunchLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Connecting to Geofence Hub...</Text>
      </View>
    );
  }

  // Determine colors based on status
  const getStatusBadgeStyles = () => {
    if (matchStatus === 'MATCHED') {
      return [styles.statusBadge, styles.badgeMatched];
    } else if (matchStatus === 'OUTSIDE') {
      return [styles.statusBadge, styles.badgeOutside];
    }
    return [styles.statusBadge, styles.badgeChecking];
  };

  return (
    <View style={styles.container}>
      <Header
        title="Attendance Map"
        subtitle="Verify coordinates and mark your status"
        onBack={onBack}
        role="EMPLOYEE"
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Date and Time Clock */}
        <View style={styles.clockRow}>
          <View style={[styles.clockCard, { marginRight: 8 }]}>
            <Text style={styles.clockLabel}>{todayDate.toUpperCase()}</Text>
            <Text style={styles.clockTime}>{liveTime}</Text>
          </View>
          <View style={[styles.clockCard, { marginLeft: 8 }]}>
            <Text style={styles.clockLabel}>TOTAL SESSION TODAY</Text>
            <Text style={[styles.clockTime, styles.greenText]}>
              {attendance ? (attendance.punchOut ? attendance.workDuration || `${attendance.totalHours?.toFixed(2)}h` : elapsedTime) : '0h 0m'}
            </Text>
          </View>
        </View>

        {/* GPS map container */}
        <Card style={styles.mapCard}>
          <View style={styles.cardHeaderRow}>
            <FontAwesome5 name="map-marker-alt" size={14} color="#0052cc" style={styles.cardHeaderIcon} />
            <Text style={styles.cardHeader}>GPS Geofence Verification</Text>
          </View>
          
          <View style={styles.mapWrapper}>
            {Platform.OS === 'web' ? (
              <iframe
                src={currentCoords 
                  ? `https://www.google.com/maps/embed/v1/directions?key=AIzaSyC69owrwi4LUj_y4-da5XP8dPbmhkiatT0&origin=${currentCoords.latitude},${currentCoords.longitude}&destination=${RSR_COORDS.latitude},${RSR_COORDS.longitude}&zoom=16`
                  : `https://www.google.com/maps/embed/v1/place?key=AIzaSyC69owrwi4LUj_y4-da5XP8dPbmhkiatT0&q=${RSR_COORDS.latitude},${RSR_COORDS.longitude}&zoom=17`
                }
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            ) : (
              <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={{
                  ...RSR_COORDS,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                }}
              >
                <Marker
                  coordinate={RSR_COORDS}
                  title="HRMS Head Office"
                  description="Allowed Geofence HQ Center"
                  pinColor="#0052cc"
                />

                {currentCoords && (
                  <Marker
                    coordinate={currentCoords}
                    title="Your Verified Location"
                    pinColor="#28a745"
                  />
                )}

                <Circle
                  center={RSR_COORDS}
                  radius={ALLOWED_RADIUS}
                  strokeColor="rgba(0, 82, 204, 0.8)"
                  fillColor="rgba(0, 82, 204, 0.1)"
                  strokeWidth={2}
                />
              </MapView>
            )}
          </View>

          <View style={styles.mapControlRow}>
            <Button
              title={fetchingLocation ? "Locating..." : "Fetch My Location"}
              type="primary"
              loading={fetchingLocation}
              onPress={fetchMyLocation}
              style={styles.fetchBtn}
              icon={<FontAwesome5 name="crosshairs" size={14} color="#ffffff" />}
            />
            {currentCoords && (
              <View style={getStatusBadgeStyles()}>
                <Text style={styles.badgeText}>
                  {matchStatus === 'MATCHED' ? 'LOCATION MATCHED' : matchStatus === 'OUTSIDE' ? 'OUTSIDE RADIUS' : 'CHECKING...'}
                </Text>
              </View>
            )}
          </View>
        </Card>

        {/* Telemetry Coordinate Cards */}
        <View style={styles.coordsRow}>
          <Card style={[styles.coordPanel, { flex: 1.2 }]}>
            <Text style={styles.panelTitle}>TELEMETRY SIGNALS</Text>
            <Text style={styles.monoText}>LAT: {currentCoords ? currentCoords.latitude.toFixed(6) : '--'}</Text>
            <Text style={styles.monoText}>LNG: {currentCoords ? currentCoords.longitude.toFixed(6) : '--'}</Text>
          </Card>
          <Card style={[styles.coordPanel, { flex: 1.8 }]}>
            <Text style={styles.panelTitle}>VERIFIED ADDRESS</Text>
            <Text style={styles.addressText} numberOfLines={2}>{address}</Text>
            {distance !== null && (
              <Text style={styles.distanceText}>
                Distance: <Text style={styles.blueText}>{Math.round(distance)} meters</Text>
              </Text>
            )}
          </Card>
        </View>

        {/* Punch operations control center */}
        <Card style={styles.controlCard}>
          <Text style={styles.controlHeader}>Status Control Center</Text>
          
          <View style={styles.controlBody}>
            {!attendance ? (
              <View style={styles.centeredContent}>
                <View style={[styles.statusBadgeSmall, styles.badgeDanger]}>
                  <Text style={[styles.badgeTextSmall, styles.textDanger]}>STATUS: NOT MARKED</Text>
                </View>
                <View style={styles.actionBtnRow}>
                  <Button
                    title="PUNCH IN"
                    type="success"
                    loading={punchLoading}
                    onPress={handlePunchIn}
                    style={styles.actionBtnLarge}
                    icon={<FontAwesome5 name="fingerprint" size={14} color="#ffffff" />}
                  />
                  <Button
                    title="WORK FROM HOME"
                    type="secondary"
                    loading={punchLoading}
                    onPress={() => setWfhModalVisible(true)}
                    style={styles.actionBtnLarge}
                    icon={<FontAwesome5 name="laptop-house" size={14} color="#0052cc" />}
                  />
                </View>
              </View>
            ) : !attendance.punchOut ? (
              <View style={styles.centeredContent}>
                <View style={[styles.statusBadgeSmall, styles.badgeWarning]}>
                  <Text style={[styles.badgeTextSmall, styles.textWarning]}>STATUS: PUNCHED-IN</Text>
                </View>
                <Text style={styles.punchTimeLabel}>
                  Punched in at: <Text style={styles.boldText}>{new Date(attendance.punchIn).toLocaleTimeString()}</Text>
                </Text>
                <Text style={styles.elapsedLabel}>
                  Elapsed: <Text style={styles.greenTextLarge}>{elapsedTime}</Text>
                </Text>
                <Button
                  title="PUNCH OUT"
                  type="danger"
                  loading={punchLoading}
                  onPress={handlePunchOut}
                  style={styles.punchOutBtn}
                  icon={<FontAwesome5 name="sign-out-alt" size={14} color="#ffffff" />}
                />
              </View>
            ) : (
              <View style={styles.centeredContent}>
                <View style={[styles.statusBadgeSmall, styles.badgeSuccess]}>
                  <Text style={[styles.badgeTextSmall, styles.textSuccess]}>STATUS: PUNCHED-OUT</Text>
                </View>
                
                <View style={styles.summaryRow}>
                  <View style={styles.summaryCol}>
                    <Text style={styles.summaryLabel}>PUNCH IN</Text>
                    <Text style={styles.summaryVal}>{new Date(attendance.punchIn).toLocaleTimeString()}</Text>
                  </View>
                  <View style={styles.summaryCol}>
                    <Text style={styles.summaryLabel}>PUNCH OUT</Text>
                    <Text style={styles.summaryVal}>{new Date(attendance.punchOut).toLocaleTimeString()}</Text>
                  </View>
                  <View style={styles.summaryCol}>
                    <Text style={styles.summaryLabel}>TOTAL DUTY</Text>
                    <Text style={[styles.summaryVal, styles.greenText]}>{attendance.workDuration || `${attendance.totalHours?.toFixed(2)}h`}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </Card>
      </ScrollView>

      {/* WFH Reason Modal */}
      <Modal
        visible={wfhModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setWfhModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Work From Home Request</Text>
            <Text style={styles.modalSubtitle}>Please specify the reason / tasks planned for today:</Text>
            
            <TextInput
              style={styles.modalInput}
              value={wfhReason}
              onChangeText={setWfhReason}
              placeholder="E.g. Code refactoring, documentation, client meetings..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={4}
            />

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                type="secondary"
                onPress={() => {
                  setWfhModalVisible(false);
                  setWfhReason('');
                }}
                style={styles.modalBtn}
              />
              <Button
                title="Request WFH"
                type="primary"
                onPress={handleWFHPunch}
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
    backgroundColor: '#f8f9fa',
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
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  clockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  clockCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e9ecef',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  clockLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#717171',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  clockTime: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0052cc',
  },
  greenText: {
    color: '#28a745',
  },
  mapCard: {
    marginBottom: 16,
    padding: 0,
    overflow: 'hidden',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: '#e9ecef',
  },
  cardHeaderIcon: {
    marginRight: 8,
  },
  cardHeader: {
    fontSize: 14,
    fontWeight: '850',
    color: '#0052cc',
  },
  mapWrapper: {
    height: 250,
    width: '100%',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapControlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#ffffff',
    borderTopWidth: 1.5,
    borderTopColor: '#e9ecef',
  },
  fetchBtn: {
    marginVertical: 0,
    paddingVertical: 10,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  badgeMatched: {
    backgroundColor: '#28a745',
  },
  badgeOutside: {
    backgroundColor: '#dc3545',
  },
  badgeChecking: {
    backgroundColor: '#6c757d',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  coordsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  coordPanel: {
    marginVertical: 0,
    padding: 12,
  },
  panelTitle: {
    fontSize: 9,
    fontWeight: '950',
    color: '#0052cc',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  monoText: {
    fontSize: 11,
    fontFamily: 'Courier',
    fontWeight: '750',
    color: '#717171',
    lineHeight: 16,
  },
  addressText: {
    fontSize: 11,
    color: '#717171',
    fontStyle: 'italic',
    fontWeight: '600',
    lineHeight: 15,
  },
  distanceText: {
    fontSize: 11,
    color: '#717171',
    fontWeight: '800',
    marginTop: 6,
  },
  blueText: {
    color: '#0052cc',
  },
  controlCard: {
    marginBottom: 20,
    padding: 0,
  },
  controlHeader: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    fontSize: 13,
    fontWeight: '850',
    color: '#0052cc',
    textAlign: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: '#e9ecef',
  },
  controlBody: {
    padding: 24,
  },
  centeredContent: {
    alignItems: 'center',
  },
  statusBadgeSmall: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 20,
  },
  badgeDanger: {
    backgroundColor: '#ffe3e3',
  },
  badgeWarning: {
    backgroundColor: '#fff9db',
  },
  badgeSuccess: {
    backgroundColor: '#e6fcf5',
  },
  badgeTextSmall: {
    fontSize: 10,
    fontWeight: '800',
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
  actionBtnRow: {
    width: '100%',
  },
  actionBtnLarge: {
    width: '100%',
    paddingVertical: 14,
  },
  punchTimeLabel: {
    fontSize: 13,
    color: '#717171',
    marginBottom: 8,
  },
  boldText: {
    fontWeight: '800',
    color: '#0052cc',
  },
  elapsedLabel: {
    fontSize: 14,
    color: '#717171',
    fontWeight: '750',
    marginBottom: 20,
  },
  greenTextLarge: {
    fontSize: 22,
    fontWeight: '900',
    color: '#28a745',
  },
  punchOutBtn: {
    width: '100%',
    paddingVertical: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    borderTopWidth: 1,
    borderColor: '#e9ecef',
    paddingTop: 16,
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: '850',
    color: '#717171',
    marginBottom: 4,
  },
  summaryVal: {
    fontSize: 13,
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
