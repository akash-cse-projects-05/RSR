import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, RefreshControl } from 'react-native';
import Card from '../components/Card';
import Button from '../components/Button';
import Header from '../components/Header';
import { getDocuments, updateBankDetails, uploadDocument, uploadPhoto } from '../api';
import { FontAwesome5 } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

export default function DocumentScreen({ onBack, user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Bank Form States
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [aadharNumber, setAadharNumber] = useState('');
  const [bankLoading, setBankLoading] = useState(false);

  // Upload Form States
  const [docName, setDocName] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);

  const loadData = async () => {
    try {
      const response = await getDocuments();
      setData(response);
      
      const emp = response.employee || {};
      const bank = emp.bankDetails || {};
      setAccountNumber(bank.accountNumber || '');
      setIfscCode(bank.ifscCode || '');
      setBankName(bank.bankName || '');
      setBranchName(bank.branchName || '');
      setAadharNumber(bank.aadharNumber || '');
    } catch (e) {
      console.error(e);
      Alert.alert('Load Failed', 'Failed to retrieve documents folder.');
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

  const handleUpdateBank = async () => {
    if (!accountNumber || !ifscCode || !bankName || !aadharNumber) {
      Alert.alert('Validation Error', 'Please fill in all mandatory bank credentials.');
      return;
    }

    setBankLoading(true);
    try {
      await updateBankDetails({
        accountNumber,
        ifscCode,
        bankName,
        branchName,
        aadharNumber
      });
      Alert.alert('Success', 'Bank details updated successfully.');
      loadData();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to update bank details.');
    } finally {
      setBankLoading(false);
    }
  };

  const handleDocumentUpload = async () => {
    if (!docName.trim()) {
      Alert.alert('Validation Error', 'Please enter a document name.');
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setUploadLoading(true);
      const asset = result.assets[0];
      await uploadDocument(docName.trim(), asset.uri, asset.mimeType || 'application/octet-stream');
      
      Alert.alert('Upload Success', 'Document submitted for HR review.');
      setDocName('');
      loadData();
    } catch (e) {
      console.error(e);
      Alert.alert('Upload Failed', e.message || 'Error uploading document.');
    } finally {
      setUploadLoading(false);
    }
  };

  const handlePhotoUpload = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Media library access is required to choose a profile photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setUploadLoading(true);
      const asset = result.assets[0];
      await uploadPhoto(asset.uri, asset.mimeType || 'image/jpeg');
      
      Alert.alert('Success', 'Profile photo updated successfully.');
      loadData();
    } catch (e) {
      console.error(e);
      Alert.alert('Upload Failed', e.message || 'Error updating profile photo.');
    } finally {
      setUploadLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading Documents Folder...</Text>
      </View>
    );
  }

  const documents = data?.documents || [];

  return (
    <View style={styles.container}>
      <Header
        title="Documents Locker"
        subtitle="Verification dossiers and bank accounts"
        onBack={onBack}
        role={user.role}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Upload Credential form */}
        <Text style={styles.sectionTitle}>Submit New Document</Text>
        <Card>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Document Type / Name</Text>
            <TextInput
              style={styles.input}
              value={docName}
              onChangeText={setDocName}
              placeholder="e.g. Passport, Aviation License, Aadhar Card"
              placeholderTextColor="#94a3b8"
            />
          </View>
          <Button
            title="Select & Upload Document"
            type="primary"
            loading={uploadLoading}
            onPress={handleDocumentUpload}
            icon={<FontAwesome5 name="file-upload" size={14} color="#ffffff" />}
          />
          <View style={styles.divider} />
          <Button
            title="Select & Upload Profile Photo"
            type="secondary"
            loading={uploadLoading}
            onPress={handlePhotoUpload}
            icon={<FontAwesome5 name="camera" size={14} color="#0052cc" />}
          />
        </Card>

        {/* Bank Credentials Form */}
        <Text style={styles.sectionTitle}>Bank Account details</Text>
        <Card>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Aadhar Card Number</Text>
            <TextInput
              style={styles.input}
              value={aadharNumber}
              onChangeText={setAadharNumber}
              keyboardType="numeric"
              placeholder="12-digit number"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Account Number</Text>
            <TextInput
              style={styles.input}
              value={accountNumber}
              onChangeText={setAccountNumber}
              keyboardType="numeric"
              placeholder="Savings/Current bank account number"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>IFSC Code</Text>
            <TextInput
              style={styles.input}
              value={ifscCode}
              onChangeText={setIfscCode}
              placeholder="11-character code"
              placeholderTextColor="#94a3b8"
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Bank Name</Text>
            <TextInput
              style={styles.input}
              value={bankName}
              onChangeText={setBankName}
              placeholder="e.g. State Bank of India"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Branch Name</Text>
            <TextInput
              style={styles.input}
              value={branchName}
              onChangeText={setBranchName}
              placeholder="e.g. Connaught Place"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <Button
            title="Save Account Structure"
            type="primary"
            loading={bankLoading}
            onPress={handleUpdateBank}
            icon={<FontAwesome5 name="save" size={14} color="#ffffff" />}
          />
        </Card>

        {/* My Document Dossiers List */}
        <Text style={styles.sectionTitle}>My Documents Dossier</Text>
        {documents.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>No documents uploaded yet.</Text>
          </Card>
        ) : (
          documents.map((doc) => {
            const isApproved = doc.status === 'APPROVED';
            const isRejected = doc.status === 'REJECTED';

            return (
              <Card key={doc._id} style={styles.docCard}>
                <View style={styles.docHeader}>
                  <Text style={styles.docName}>{doc.name}</Text>
                  <View style={[
                    styles.badge,
                    isApproved ? styles.badgeSuccess : isRejected ? styles.badgeDanger : styles.badgeWarning
                  ]}>
                    <Text style={[
                      styles.badgeText,
                      isApproved ? styles.textSuccess : isRejected ? styles.textDanger : styles.textWarning
                    ]}>
                      {doc.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.docType}>Type: {doc.fileType}</Text>
                <Text style={styles.docDate}>
                  Uploaded: {new Date(doc.createdAt).toLocaleDateString()}
                </Text>
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
  formGroup: {
    marginBottom: 14,
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
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 12,
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
  docCard: {
    marginVertical: 6,
  },
  docHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  docName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
    marginRight: 10,
  },
  badge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
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
    color: '#28a745',
  },
  textDanger: {
    color: '#dc3545',
  },
  textWarning: {
    color: '#ffc107',
  },
  docType: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  docDate: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '600',
  },
});
