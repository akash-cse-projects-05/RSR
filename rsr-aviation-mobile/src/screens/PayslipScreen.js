import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, RefreshControl, FlatList, TouchableOpacity } from 'react-native';
import Card from '../components/Card';
import Button from '../components/Button';
import Header from '../components/Header';
import { getPayslips, getEmployeePayslipsHR, updateSalaryStructure, generatePayslipBulk } from '../api';

export default function PayslipScreen({ onBack, user }) {
  const isHR = user.role === 'HR';
  const [payslipsList, setPayslipsList] = useState([]);
  const [employeesList, setEmployeesList] = useState([]); // Used by HR
  const [selectedEmployee, setSelectedEmployee] = useState(null); // HR selected employee
  const [selectedEmployeePayslips, setSelectedEmployeePayslips] = useState([]);
  
  // Salary structure form (HR)
  const [salary, setSalary] = useState('');
  const [hra, setHra] = useState('');
  const [travelAllowance, setTravelAllowance] = useState('');
  const [otherAllowances, setOtherAllowances] = useState('');
  const [pf, setPf] = useState('');
  const [professionalTax, setProfessionalTax] = useState('');
  const [incomeTax, setIncomeTax] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);

  // Bulk generate form (HR)
  const [bulkMonth, setBulkMonth] = useState('');
  const [bulkYear, setBulkYear] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const response = await getPayslips(isHR);
      if (isHR) {
        setEmployeesList(response.employees || []);
      } else {
        setPayslipsList(response.payslips || []);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to retrieve payslip metrics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectEmployee = async (employee) => {
    setSelectedEmployee(employee);
    setSalary(String(employee.salary || 0));
    setHra(String(employee.hra || 0));
    setTravelAllowance(String(employee.travelAllowance || 0));
    setOtherAllowances(String(employee.otherAllowances || 0));
    setPf(String(employee.pf || 0));
    setProfessionalTax(String(employee.professionalTax || 0));
    setIncomeTax(String(employee.incomeTax || 0));

    try {
      const data = await getEmployeePayslipsHR(employee._id);
      setSelectedEmployeePayslips(data.payslips || []);
    } catch (e) {
      console.error(e);
      setSelectedEmployeePayslips([]);
    }
  };

  const handleUpdateStructure = async () => {
    if (!selectedEmployee) return;
    setUpdateLoading(true);
    try {
      await updateSalaryStructure(selectedEmployee._id, {
        salary: parseFloat(salary),
        hra: parseFloat(hra),
        travelAllowance: parseFloat(travelAllowance),
        otherAllowances: parseFloat(otherAllowances),
        pf: parseFloat(pf),
        professionalTax: parseFloat(professionalTax),
        incomeTax: parseFloat(incomeTax)
      });
      Alert.alert('Success', 'Employee salary structure updated successfully.');
      loadData();
    } catch (e) {
      Alert.alert('Failed', e.message || 'Error updating salary parameters.');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleBulkGenerate = async () => {
    if (!bulkMonth || !bulkYear) {
      Alert.alert('Validation Error', 'Month and Year are required.');
      return;
    }
    setBulkLoading(true);
    try {
      await generatePayslipBulk(parseInt(bulkMonth), parseInt(bulkYear));
      Alert.alert('Payroll Generated', 'Bulk payslips created for active employees.');
      setBulkMonth('');
      setBulkYear('');
      loadData();
      if (selectedEmployee) {
        selectEmployee(selectedEmployee);
      }
    } catch (e) {
      Alert.alert('Failed', e.message || 'Error executing bulk generation.');
    } finally {
      setBulkLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const renderPayslipItem = ({ item }) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = months[item.month - 1] || item.month;

    return (
      <Card style={styles.payslipCard} accentColor="#0ca678">
        <View style={styles.payslipHeader}>
          <Text style={styles.payslipTitle}>{monthName} {item.year}</Text>
          <Text style={styles.netPayText}>₹{item.netPay?.toFixed(2)}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Basic Salary</Text>
          <Text style={styles.detailVal}>₹{item.basicSalary?.toFixed(2)}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Total Allowances</Text>
          <Text style={styles.detailVal}>₹{(item.hra + item.travelAllowance + item.otherAllowances)?.toFixed(2)}</Text>
        </View>

        {item.bonuses > 0 && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Bonuses</Text>
            <Text style={styles.detailVal}>₹{item.bonuses?.toFixed(2)}</Text>
          </View>
        )}

        {item.reimbursements > 0 && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Reimbursements</Text>
            <Text style={styles.detailVal}>₹{item.reimbursements?.toFixed(2)}</Text>
          </View>
        )}

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Deductions (LOP, Tax, PF)</Text>
          <Text style={[styles.detailVal, styles.redText]}>-₹{item.deductions?.toFixed(2)}</Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Status: {item.paymentStatus || 'Not Yet Paid'}</Text>
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title={isHR ? 'Payroll Command' : 'My Payslips'}
        subtitle={isHR ? 'Manage salary configurations and runs' : 'Review monthly salary deposits'}
        onBack={selectedEmployee ? () => setSelectedEmployee(null) : onBack}
        role={user.role}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {isHR ? (
          // HR ADMIN INTERFACE
          !selectedEmployee ? (
            // HR VIEW: List of Employees + Bulk Generate Card
            <View>
              {/* Bulk Generate Card */}
              <Card style={styles.bulkCard}>
                <Text style={styles.sectionTitle}>Bulk Run Payroll</Text>
                <View style={styles.rowInputs}>
                  <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.label}>Month (1-12)</Text>
                    <TextInput
                      style={styles.input}
                      value={bulkMonth}
                      onChangeText={setBulkMonth}
                      keyboardType="numeric"
                      placeholder="e.g. 6"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                  <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.label}>Year</Text>
                    <TextInput
                      style={styles.input}
                      value={bulkYear}
                      onChangeText={setBulkYear}
                      keyboardType="numeric"
                      placeholder="e.g. 2026"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                </View>
                <Button
                  title="⚡ Execute Payroll Generation"
                  type="primary"
                  loading={bulkLoading}
                  onPress={handleBulkGenerate}
                />
              </Card>

              {/* Employee list */}
              <Text style={styles.sectionTitle}>Employee Pay Profiles</Text>
              {employeesList.map((emp) => (
                <TouchableOpacity key={emp._id} onPress={() => selectEmployee(emp)}>
                  <Card style={styles.employeeCard} accentColor="#0052cc">
                    <Text style={styles.empName}>{emp.firstName} {emp.lastName || ''}</Text>
                    <Text style={styles.empSub}>{emp.employeeCode} • {emp.department} • {emp.designation}</Text>
                    <Text style={styles.empSalary}>Salary Basis: ₹{emp.salary?.toLocaleString()}</Text>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            // HR VIEW: Edit Salary Structure + Payslip History for selected employee
            <View>
              {/* Profile Card */}
              <Card style={styles.selectedProfileCard}>
                <Text style={styles.selectedEmpName}>{selectedEmployee.firstName} {selectedEmployee.lastName || ''}</Text>
                <Text style={styles.selectedEmpSub}>{selectedEmployee.employeeCode} • {selectedEmployee.department}</Text>
              </Card>

              {/* Edit structure form */}
              <Card style={styles.structureCard}>
                <Text style={styles.sectionTitle}>Configure Salary Structure</Text>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Basic Salary (₹)</Text>
                  <TextInput style={styles.input} value={salary} onChangeText={setSalary} keyboardType="numeric" />
                </View>

                <View style={styles.rowInputs}>
                  <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.label}>HRA Allowance</Text>
                    <TextInput style={styles.input} value={hra} onChangeText={setHra} keyboardType="numeric" />
                  </View>
                  <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.label}>Travel Allowance</Text>
                    <TextInput style={styles.input} value={travelAllowance} onChangeText={setTravelAllowance} keyboardType="numeric" />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Other Allowances</Text>
                  <TextInput style={styles.input} value={otherAllowances} onChangeText={setOtherAllowances} keyboardType="numeric" />
                </View>

                <View style={styles.rowInputs}>
                  <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.label}>PF Deduction</Text>
                    <TextInput style={styles.input} value={pf} onChangeText={setPf} keyboardType="numeric" />
                  </View>
                  <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.label}>Professional Tax</Text>
                    <TextInput style={styles.input} value={professionalTax} onChangeText={setProfessionalTax} keyboardType="numeric" />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Income Tax (TDS)</Text>
                  <TextInput style={styles.input} value={incomeTax} onChangeText={setIncomeTax} keyboardType="numeric" />
                </View>

                <Button
                  title="Update Structure Settings"
                  loading={updateLoading}
                  onPress={handleUpdateStructure}
                />
              </Card>

              <Text style={styles.sectionTitle}>Generated Payslips History</Text>
              {selectedEmployeePayslips.length === 0 ? (
                <Card style={styles.emptyCard}><Text style={styles.emptyText}>No payslips generated for this employee.</Text></Card>
              ) : (
                <FlatList data={selectedEmployeePayslips} renderItem={renderPayslipItem} keyExtractor={(item) => item._id} scrollEnabled={false} />
              )}
            </View>
          )
        ) : (
          // EMPLOYEE INTERFACE: View own payslips
          <View>
            <Text style={styles.sectionTitle}>Salary Logs</Text>
            {payslipsList.length === 0 ? (
              <Card style={styles.emptyCard}><Text style={styles.emptyText}>No payslips detected in folder.</Text></Card>
            ) : (
              <FlatList
                data={payslipsList}
                renderItem={renderPayslipItem}
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
  payslipCard: {
    marginVertical: 6,
  },
  payslipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    paddingBottom: 10,
    marginBottom: 10,
  },
  payslipTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  netPayText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0ca678',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  detailLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  detailVal: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '700',
  },
  redText: {
    color: '#dc3545',
  },
  statusRow: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
  },
  statusLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  bulkCard: {
    marginBottom: 16,
  },
  employeeCard: {
    marginVertical: 6,
  },
  empName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  empSub: {
    fontSize: 11,
    color: '#64748b',
    marginVertical: 3,
    fontWeight: '600',
  },
  empSalary: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0052cc',
    marginTop: 2,
  },
  selectedProfileCard: {
    backgroundColor: '#0052cc',
    borderColor: '#0052cc',
  },
  selectedEmpName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  selectedEmpSub: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
    fontWeight: '600',
  },
  structureCard: {
    marginBottom: 20,
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
});
