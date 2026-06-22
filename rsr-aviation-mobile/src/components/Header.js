import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function Header({ title, subtitle, onBack, onLogout, role }) {
  return (
    <View style={styles.headerContainer}>
      <View style={styles.topRow}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.brand}>✈ HRMS</Text>
        )}

        <View style={styles.rightSide}>
          {role && (
            <View style={[styles.badge, role === 'HR' ? styles.badgeHR : styles.badgeEmployee]}>
              <Text style={styles.badgeText}>{role === 'HR' ? 'HR TERMINAL' : 'EMPLOYEE'}</Text>
            </View>
          )}
          {onLogout && (
            <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.bottomRow}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#0052cc',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  brand: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  backButton: {
    paddingVertical: 4,
  },
  backText: {
    color: '#e6f0ff',
    fontSize: 15,
    fontWeight: '700',
  },
  rightSide: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 10,
  },
  badgeHR: {
    backgroundColor: '#0055aa',
  },
  badgeEmployee: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  logoutText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  bottomRow: {
    marginTop: 8,
  },
  title: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#e6f0ff',
    fontSize: 13,
    marginTop: 4,
    opacity: 0.9,
  },
});
