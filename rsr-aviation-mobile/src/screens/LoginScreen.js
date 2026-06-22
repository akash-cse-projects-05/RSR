import React, { useState, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ScrollView, TouchableOpacity } from 'react-native';
import Button from '../components/Button';
import { login } from '../api';
import { FontAwesome5 } from '@expo/vector-icons';

export default function LoginScreen({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isHR, setIsHR] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Focus states to emulate input-group highlight
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  // Refs to focus inputs when tapping the wrappers
  const usernameInputRef = useRef(null);
  const passwordInputRef = useRef(null);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      Alert.alert('Validation Error', 'Please enter both username and password.');
      return;
    }

    setLoading(true);
    try {
      const data = await login(username.trim(), password, isHR);
      const userPayload = {
        role: isHR ? 'HR' : 'EMPLOYEE',
        username: username.trim(),
        employeeId: data.employeeId || '000000000000000000000000',
        firstName: data.employeeName || (isHR ? 'System Admin' : 'Employee')
      };
      
      onLoginSuccess(userPayload);
    } catch (error) {
      Alert.alert('Login Failed', error.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  // Determine current theme colors dynamically
  const containerBg = isHR ? '#deebff' : '#f7f9fc'; // Soft light blue (#deebff) for HR, light grey (#f7f9fc) for Employee
  const cardBg = '#ffffff'; // White card on both screens
  const cardBorder = isHR ? '#dee2e6' : '#ebebeb';
  
  const textColor = isHR ? '#091e42' : '#222222';
  const subtextColor = isHR ? '#626f86' : '#717171';
  const labelColor = isHR ? '#626f86' : '#222222';
  
  const inputBorder = isHR ? '#dee2e6' : '#ebebeb';
  const inputPlaceholderColor = '#94a3b8';

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: containerBg }]}>
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        
        {/* Brand Logo & Header */}
        <View style={styles.headerContainer}>
          <FontAwesome5 
            name="paper-plane" 
            size={36} 
            color="#0052cc" 
            style={styles.logoIcon} 
          />
          <Text style={[styles.title, { color: textColor }]}>
            {isHR ? 'HRMS' : 'Employee Login'}
          </Text>
          <Text style={[styles.subtitle, { color: subtextColor }]}>
            {isHR ? 'HR TERMINAL ACCESS' : 'Enter your credentials to access the HRMS portal'}
          </Text>
        </View>

        {/* Input Fields */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: labelColor }]}>
            {isHR ? 'HR Identifier' : 'Employee Code'}
          </Text>
          <TouchableOpacity 
            activeOpacity={1}
            onPress={() => usernameInputRef.current?.focus()}
            style={[
              styles.inputWrapper, 
              { borderColor: usernameFocused ? '#0052cc' : inputBorder },
              usernameFocused && styles.inputWrapperFocused
            ]}
          >
            <FontAwesome5 
              name={isHR ? "user-shield" : "id-badge"} 
              size={18} 
              color={subtextColor} 
              style={styles.inputIcon} 
            />
            <TextInput
              ref={usernameInputRef}
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder={isHR ? 'Admin username' : 'RSR001'}
              placeholderTextColor={inputPlaceholderColor}
              autoCapitalize="none"
              onFocus={() => setUsernameFocused(true)}
              onBlur={() => setUsernameFocused(false)}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.passwordLabelRow}>
            <Text style={[styles.label, { color: labelColor }]}>Password</Text>
            {!isHR && (
              <TouchableOpacity onPress={() => Alert.alert('Reset Password', 'Please contact your administrator to reset your password.')}>
                <Text style={styles.forgotLink}>Forgot?</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity 
            activeOpacity={1}
            onPress={() => passwordInputRef.current?.focus()}
            style={[
              styles.inputWrapper, 
              { borderColor: passwordFocused ? '#0052cc' : inputBorder },
              passwordFocused && styles.inputWrapperFocused
            ]}
          >
            <FontAwesome5 
              name="lock" 
              size={18} 
              color={subtextColor} 
              style={styles.inputIcon} 
            />
            <TextInput
              ref={passwordInputRef}
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={inputPlaceholderColor}
              secureTextEntry
              autoCapitalize="none"
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
            />
          </TouchableOpacity>
        </View>

        {/* Action Button */}
        <Button
          title={isHR ? "Authenticate Access" : "Sign In"}
          onPress={handleLogin}
          loading={loading}
          style={[styles.button, { backgroundColor: '#0052cc' }]}
        />
        
        {/* Portal Switching / Footer */}
        <View style={styles.footerContainer}>
          {isHR ? (
            <>
              <Text style={styles.secureText}>
                <FontAwesome5 name="exclamation-circle" size={12} color="#f59e0b" /> Secure Administrative Portal
              </Text>
              <TouchableOpacity style={styles.portalToggleBtn} onPress={() => { setIsHR(false); setUsername(''); setPassword(''); }}>
                <Text style={styles.portalToggleText}>
                  <FontAwesome5 name="arrow-left" size={12} color="#0052cc" /> Back to Employee Login
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.secureText}>
                <FontAwesome5 name="shield-alt" size={12} color="#717171" /> Authorized Personnel Only
              </Text>
              <TouchableOpacity style={styles.portalToggleBtn} onPress={() => { setIsHR(true); setUsername(''); setPassword(''); }}>
                <Text style={styles.portalToggleText}>
                  <FontAwesome5 name="user-shield" size={12} color="#0052cc" /> HR / Admin Login
                </Text>
              </TouchableOpacity>
            </>
          )}
          
          <Text style={styles.copyrightText}>© 2026 HRMS • Precision Management</Text>
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoIcon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  inputGroup: {
    width: '100%',
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  forgotLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0052cc',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    backgroundColor: '#ffffff',
  },
  inputWrapperFocused: {
    borderWidth: 1.5,
    shadowColor: '#0052cc',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    color: '#222222',
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 0,
  },
  button: {
    width: '100%',
    height: 52,
    borderRadius: 12,
    marginTop: 8,
  },
  footerContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  secureText: {
    fontSize: 12,
    color: '#717171',
    fontWeight: '600',
    marginBottom: 16,
  },
  portalToggleBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  portalToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0052cc',
  },
  copyrightText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 28,
    fontWeight: '600',
  },
});
