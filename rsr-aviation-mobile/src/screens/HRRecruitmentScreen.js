import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Modal } from 'react-native';
import Card from '../components/Card';
import Button from '../components/Button';
import Header from '../components/Header';
import { addHRNewEmployee } from '../api';

export default function HRRecruitmentScreen({ onBack, user }) {
  const [form, setForm] = useState({
    employeeCode: '',
    phoneNumber: '',
    firstName: '',
    lastName: '',
    dob: '', // YYYY-MM-DD
    email: '',
    department: 'SALES',
    designation: 'STAFF',
    employmentType: 'Full-Time',
    salary: '',
    joiningDate: new Date().toISOString().split('T')[0], // default to today
    workLocation: 'Hyderabad',
  });

  const [loading, setLoading] = useState(false);

  // Dropdown states
  const [activePicker, setActivePicker] = useState(null); // 'department' | 'designation' | 'employmentType'

  const departments = ['SALES', 'IT', 'HR', 'PROCUREMENT', 'LOGISTICS', 'OPERATIONS', 'STORES', 'ACCOUNTS'];
  const designations = ['STAFF', 'MANAGER'];
  const employmentTypes = ['Full-Time', 'Part-Time', 'Contract', 'Intern'];

  const handleInputChange = (field, val) => {
    setForm((prev) => ({ ...prev, [field]: val }));
  };

  const handleSelectOption = (field, option) => {
    setForm((prev) => ({ ...prev, [field]: option }));
    setActivePicker(null);
  };

  const validateForm = () => {
    if (!form.employeeCode) return 'Employee Code is required';
    if (!form.phoneNumber) return 'Contact Number is required';
    if (!form.firstName) return 'First Name is required';
    if (!form.dob) return 'Date of Birth (YYYY-MM-DD) is required';
    if (!form.email) return 'Email is required';
    if (!form.salary) return 'Salary is required';
    if (!form.joiningDate) return 'Onboarding Date (YYYY-MM-DD) is required';

    // Simple date regex test (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(form.dob)) return 'DOB must be in YYYY-MM-DD format';
    if (!dateRegex.test(form.joiningDate)) return 'Onboarding Date must be in YYYY-MM-DD format';

    return null;
  };

  const handleSubmit = async () => {
    const errorMsg = validateForm();
    if (errorMsg) {
      Alert.alert('Validation Error', errorMsg);
      return;
    }

    setLoading(true);
    try {
      const response = await addHRNewEmployee({
        ...form,
        salary: Number(form.salary),
      });

      if (response.success) {
        Alert.alert('Success', 'Employee registered and user profile created successfully!', [
          { text: 'OK', onPress: () => onBack() }
        ]);
      } else {
        throw new Error(response.error || 'Registration failed');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Registration Failed', e.message || 'Error occurred while communicating with database.');
    } finally {
      setLoading(false);
    }
  };

  const renderPickerModal = () => {
    let options = [];
    let title = '';
    let currentField = '';

    if (activePicker === 'department') {
      options = departments;
      title = 'Select Department';
      currentField = 'department';
    } else if (activePicker === 'designation') {
      options = designations;
      title = 'Select Designation';
      currentField = 'designation';
    } else if (activePicker === 'employmentType') {
      options = employmentTypes;
      title = 'Select Employment Type';
      currentField = 'employmentType';
    }

    if (!activePicker) return null;

    return (
      <Modal visible={true} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{title}</Text>
            <ScrollView style={styles.modalScroll}>
              {options.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  onPress={() => handleSelectOption(currentField, opt)}
                  style={[
                    styles.modalOption,
                    form[currentField] === opt && styles.modalOptionActive
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.modalOptionText,
                    form[currentField] === opt && styles.modalOptionTextActive
                  ]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={() => setActivePicker(null)} style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Add Employee"
        subtitle="Register employee details in the central directory"
        onBack={onBack}
        role={user.role}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerBadgeContainer}>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>Human Capital Management</Text>
          </View>
          <Text style={styles.formTitle}>Add New Employee Profile</Text>
          <Text style={styles.formSubtitle}>
            Enter the professional and personal details to create a new record in the corporate directory.
          </Text>
        </View>

        <Card style={styles.formCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Employee ID / Code *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. HRMS-2026-001"
              placeholderTextColor="#717171"
              value={form.employeeCode}
              onChangeText={(val) => handleInputChange('employeeCode', val)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Contact Number *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="+91 00000 00000"
              placeholderTextColor="#717171"
              value={form.phoneNumber}
              onChangeText={(val) => handleInputChange('phoneNumber', val)}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.flexHalf]}>
              <Text style={styles.inputLabel}>First Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="First Name"
                placeholderTextColor="#717171"
                value={form.firstName}
                onChangeText={(val) => handleInputChange('firstName', val)}
              />
            </View>
            <View style={[styles.inputGroup, styles.flexHalf]}>
              <Text style={styles.inputLabel}>Last Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Last Name"
                placeholderTextColor="#717171"
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
            <Text style={styles.inputLabel}>Official Email Address *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="employee@rsr-corp.com"
              placeholderTextColor="#717171"
              value={form.email}
              onChangeText={(val) => handleInputChange('email', val)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Department Picker */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Assign Department *</Text>
            <TouchableOpacity
              onPress={() => setActivePicker('department')}
              style={styles.pickerSelector}
              activeOpacity={0.7}
            >
              <Text style={styles.pickerSelectorText}>{form.department}</Text>
              <Text style={styles.pickerSelectorArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          {/* Designation Picker */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Designation / Role *</Text>
            <TouchableOpacity
              onPress={() => setActivePicker('designation')}
              style={styles.pickerSelector}
              activeOpacity={0.7}
            >
              <Text style={styles.pickerSelectorText}>{form.designation}</Text>
              <Text style={styles.pickerSelectorArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          {/* Employment Classification Picker */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Employment Classification</Text>
            <TouchableOpacity
              onPress={() => setActivePicker('employmentType')}
              style={styles.pickerSelector}
              activeOpacity={0.7}
            >
              <Text style={styles.pickerSelectorText}>{form.employmentType}</Text>
              <Text style={styles.pickerSelectorArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Monthly Salary * (₹)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 50000"
              placeholderTextColor="#717171"
              value={form.salary}
              onChangeText={(val) => handleInputChange('salary', val)}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Onboarding Date * (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 2026-06-15"
              placeholderTextColor="#717171"
              value={form.joiningDate}
              onChangeText={(val) => handleInputChange('joiningDate', val)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Assigned Work Location</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Hyderabad"
              placeholderTextColor="#717171"
              value={form.workLocation}
              onChangeText={(val) => handleInputChange('workLocation', val)}
            />
          </View>

          <Button
            title="Register Employee & Create Profile"
            onPress={handleSubmit}
            loading={loading}
            style={styles.btnSave}
          />
        </Card>
      </ScrollView>

      {renderPickerModal()}
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
  headerBadgeContainer: {
    alignItems: 'center',
    marginVertical: 14,
  },
  headerBadge: {
    backgroundColor: '#f0f7ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
  },
  headerBadgeText: {
    color: '#0052cc',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 6,
  },
  formSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 18,
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
    borderColor: '#e2e8f0',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 10,
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
  pickerSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  pickerSelectorText: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '600',
  },
  pickerSelectorArrow: {
    fontSize: 10,
    color: '#64748b',
  },
  btnSave: {
    backgroundColor: '#0052cc',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 12,
    shadowColor: '#0052cc',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    width: '100%',
    maxHeight: '70%',
    padding: 20,
    borderColor: '#e2e8f0',
    borderWidth: 1,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  modalTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modalScroll: {
    marginBottom: 16,
  },
  modalOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalOptionActive: {
    backgroundColor: '#e6f0ff',
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  modalOptionText: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '600',
  },
  modalOptionTextActive: {
    color: '#0052cc',
    fontWeight: '700',
  },
  modalCloseBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
  },
  modalCloseText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
});
