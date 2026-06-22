import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import Card from '../components/Card';
import Button from '../components/Button';
import Header from '../components/Header';
import { getEmployeeDetails, updateEmployeeDetails } from '../api';

export default function HRUserEditScreen({ routeParams, onBack, user }) {
  const employeeId = routeParams?.employeeId;

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    dob: '', // YYYY-MM-DD
    employeeCode: '',
    department: '',
    designation: '',
    salary: '',
    email: '',
    phoneNumber: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!employeeId) {
        Alert.alert('Error', 'No employee identifier provided.');
        onBack();
        return;
      }
      try {
        const response = await getEmployeeDetails(employeeId);
        const emp = response.employee || {};
        
        let formattedDob = '';
        if (emp.dob) {
          formattedDob = new Date(emp.dob).toISOString().split('T')[0];
        }

        setForm({
          firstName: emp.firstName || '',
          lastName: emp.lastName || '',
          dob: formattedDob,
          employeeCode: emp.employeeCode || '',
          department: emp.department || '',
          designation: emp.designation || '',
          salary: emp.salary ? String(emp.salary) : '0',
          email: emp.email || '',
          phoneNumber: emp.phoneNumber || '',
        });
      } catch (e) {
        console.error(e);
        Alert.alert('Error', 'Failed to retrieve employee profile data.');
        onBack();
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [employeeId]);

  const handleInputChange = (field, val) => {
    setForm((prev) => ({ ...prev, [field]: val }));
  };

  const validateForm = () => {
    if (!form.firstName) return 'First Name is required';
    if (!form.dob) return 'Date of Birth (YYYY-MM-DD) is required';
    if (!form.employeeCode) return 'Employee Code is required';
    if (!form.department) return 'Department is required';
    if (!form.designation) return 'Designation is required';
    if (!form.email) return 'Email is required';
    if (!form.phoneNumber) return 'Phone Number is required';

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(form.dob)) return 'DOB must be in YYYY-MM-DD format';

    return null;
  };

  const handleSave = async () => {
    const errorMsg = validateForm();
    if (errorMsg) {
      Alert.alert('Validation Error', errorMsg);
      return;
    }

    setSaving(true);
    try {
      const response = await updateEmployeeDetails(employeeId, {
        ...form,
        salary: Number(form.salary),
      });

      if (response.success) {
        Alert.alert('Success', 'Employee details updated successfully!', [
          { text: 'OK', onPress: () => onBack() }
        ]);
      } else {
        throw new Error(response.error || 'Failed to update employee details');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Save Failed', e.message || 'Error occurred while saving modifications.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Loading profile dossier...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title="Edit Employee"
        subtitle={`Modifying profile for Code: ${form.employeeCode}`}
        onBack={onBack}
        role={user.role}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.formCard}>
          <Text style={styles.formHeader}>Edit Employee Information</Text>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.flexHalf]}>
              <Text style={styles.inputLabel}>First Name *</Text>
              <TextInput
                style={styles.textInput}
                value={form.firstName}
                onChangeText={(val) => handleInputChange('firstName', val)}
              />
            </View>
            <View style={[styles.inputGroup, styles.flexHalf]}>
              <Text style={styles.inputLabel}>Last Name</Text>
              <TextInput
                style={styles.textInput}
                value={form.lastName}
                onChangeText={(val) => handleInputChange('lastName', val)}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Date of Birth * (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 1995-08-25"
              placeholderTextColor="#717171"
              value={form.dob}
              onChangeText={(val) => handleInputChange('dob', val)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Employee Code *</Text>
            <TextInput
              style={styles.textInput}
              value={form.employeeCode}
              onChangeText={(val) => handleInputChange('employeeCode', val)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Department *</Text>
            <TextInput
              style={styles.textInput}
              value={form.department}
              onChangeText={(val) => handleInputChange('department', val)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Designation *</Text>
            <TextInput
              style={styles.textInput}
              value={form.designation}
              onChangeText={(val) => handleInputChange('designation', val)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Monthly Salary * (₹)</Text>
            <TextInput
              style={styles.textInput}
              value={form.salary}
              onChangeText={(val) => handleInputChange('salary', val)}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Address *</Text>
            <TextInput
              style={styles.textInput}
              value={form.email}
              onChangeText={(val) => handleInputChange('email', val)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number *</Text>
            <TextInput
              style={styles.textInput}
              value={form.phoneNumber}
              onChangeText={(val) => handleInputChange('phoneNumber', val)}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.actionBtnRow}>
            <TouchableOpacity
              onPress={onBack}
              disabled={saving}
              style={[styles.btn, styles.btnCancel]}
              activeOpacity={0.7}
            >
              <Text style={styles.btnCancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={[styles.btn, styles.btnSave]}
              activeOpacity={0.7}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.btnSaveText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
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
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginTop: 10,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  formHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    paddingBottom: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 13,
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flexHalf: {
    flex: 1,
  },
  actionBtnRow: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancel: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
    borderWidth: 1.5,
  },
  btnCancelText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
  },
  btnSave: {
    backgroundColor: '#0052cc',
  },
  btnSaveText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
