import React from 'react';
import { View, StyleSheet } from 'react-native';

export default function Card({ children, style, accentColor }) {
  return (
    <View style={[styles.card, style]}>
      {accentColor && <View style={[styles.accent, { backgroundColor: accentColor }]} />}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ebebeb',
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
  },
  content: {
    padding: 18,
  },
});
