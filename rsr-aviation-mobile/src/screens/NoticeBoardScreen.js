import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, RefreshControl, FlatList } from 'react-native';
import Card from '../components/Card';
import Button from '../components/Button';
import Header from '../components/Header';
import { getNotices, createNotice } from '../api';
import { FontAwesome5 } from '@expo/vector-icons';

export default function NoticeBoardScreen({ onBack, user }) {
  const isHR = user.role === 'HR';
  const [announcements, setAnnouncements] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [birthdays, setBirthdays] = useState([]);
  const [newJoiners, setNewJoiners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form states (HR)
  const [type, setType] = useState('announcement'); // announcement or notification
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  const loadData = async () => {
    try {
      const response = await getNotices();
      setAnnouncements(response.announcements || []);
      setNotifications(response.notifications || []);
      setBirthdays(response.todaysBirthdays || []);
      setNewJoiners(response.newJoiners || []);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to load notice board details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePost = async () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert('Validation Error', 'Title and Message cannot be empty.');
      return;
    }

    setSubmitLoading(true);
    try {
      await createNotice({
        type,
        title: title.trim(),
        message: message.trim()
      });
      Alert.alert('Success', 'Broadcast published successfully.');
      setTitle('');
      setMessage('');
      loadData();
    } catch (e) {
      Alert.alert('Publish Failed', e.message || 'Error publishing notice.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const renderNoticeItem = ({ item }) => (
    <Card style={styles.itemCard} accentColor="#0052cc">
      <Text style={styles.itemTitle}>{item.title}</Text>
      <Text style={styles.itemDate}>Posted on: {item.date ? new Date(item.date).toLocaleDateString() : new Date().toLocaleDateString()}</Text>
      <Text style={styles.itemMessage}>{item.message}</Text>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Header
        title="Notice Board"
        subtitle="Bulletins, Birthdays & System Broadcasts"
        onBack={onBack}
        role={user.role}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Birthdays Section */}
        {birthdays.length > 0 && (
          <View style={styles.celebrationSection}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 10 }}>
              <FontAwesome5 name="birthday-cake" size={14} color="#c92a2a" style={{ marginRight: 6 }} />
              <Text style={[styles.sectionTitle, { marginVertical: 0 }]}>Today's Birthdays</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {birthdays.map((b, index) => (
                <View key={index} style={styles.birthdayBubble}>
                  <Text style={styles.birthdayName}>{b.firstName} {b.lastName || ''}</Text>
                  <Text style={styles.birthdayDept}>{b.department || 'Operations'}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* New Joiners Section */}
        {newJoiners.length > 0 && (
          <View style={styles.celebrationSection}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 10 }}>
              <FontAwesome5 name="plane-arrival" size={14} color="#087f5b" style={{ marginRight: 6 }} />
              <Text style={[styles.sectionTitle, { marginVertical: 0 }]}>New Joiners (Last 30 Days)</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {newJoiners.map((j, index) => (
                <View key={index} style={styles.joinerBubble}>
                  <Text style={styles.joinerName}>{j.firstName} {j.lastName || ''}</Text>
                  <Text style={styles.joinerDept}>{j.designation || 'Staff'}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Create Broadcast Form (HR Admin) */}
        {isHR && (
          <Card style={styles.formCard}>
            <Text style={styles.sectionTitle}>Post New Broadcast</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Broadcast Category</Text>
              <View style={styles.btnRow}>
                <Button
                  title="Announcement"
                  type={type === 'announcement' ? 'primary' : 'secondary'}
                  onPress={() => setType('announcement')}
                  style={styles.halfBtn}
                />
                <Button
                  title="Alert / Notification"
                  type={type === 'notification' ? 'primary' : 'secondary'}
                  onPress={() => setType('notification')}
                  style={styles.halfBtn}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Broadcast subject"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Message Body</Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={4}
                placeholder="Write message contents here..."
                placeholderTextColor="#94a3b8"
              />
            </View>

            <Button
              title="Publish Broadcast"
              onPress={handlePost}
              loading={submitLoading}
            />
          </Card>
        )}

        {/* Notices list */}
        <Text style={styles.sectionTitle}>General Bulletins</Text>
        {announcements.length === 0 ? (
          <Card style={styles.emptyCard}><Text style={styles.emptyText}>No bulletins published yet.</Text></Card>
        ) : (
          <FlatList
            data={announcements}
            renderItem={renderNoticeItem}
            keyExtractor={(item, index) => item._id || index.toString()}
            scrollEnabled={false}
          />
        )}

        <Text style={styles.sectionTitle}>System Alerts & Notifications</Text>
        {notifications.length === 0 ? (
          <Card style={styles.emptyCard}><Text style={styles.emptyText}>No alerts active currently.</Text></Card>
        ) : (
          <FlatList
            data={notifications}
            renderItem={renderNoticeItem}
            keyExtractor={(item, index) => item._id || index.toString()}
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
  celebrationSection: {
    marginBottom: 16,
  },
  horizontalScroll: {
    flexDirection: 'row',
    marginTop: 6,
  },
  birthdayBubble: {
    backgroundColor: '#ffe3e3',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ffc9c9',
    alignItems: 'center',
    minWidth: 110,
  },
  birthdayName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#c92a2a',
  },
  birthdayDept: {
    fontSize: 10,
    color: '#fa5252',
    fontWeight: '700',
    marginTop: 2,
  },
  joinerBubble: {
    backgroundColor: '#e6fcf5',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#c3fae8',
    alignItems: 'center',
    minWidth: 110,
  },
  joinerName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#087f5b',
  },
  joinerDept: {
    fontSize: 10,
    color: '#12b886',
    fontWeight: '700',
    marginTop: 2,
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
    marginVertical: 10,
  },
  formGroup: {
    marginBottom: 16,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfBtn: {
    width: '48%',
    paddingVertical: 10,
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
    height: 100,
    textAlignVertical: 'top',
  },
  itemCard: {
    marginVertical: 6,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  itemDate: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  itemMessage: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    lineHeight: 18,
  },
  emptyCard: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
});
