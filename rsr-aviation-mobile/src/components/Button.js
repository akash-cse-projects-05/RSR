import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';

export default function Button({ title, onPress, type = 'primary', loading = false, disabled = false, style, textStyle, icon }) {
  const buttonStyles = [styles.btn];
  const textStyles = [styles.btnText];

  if (type === 'primary') {
    buttonStyles.push(styles.btnPrimary);
  } else if (type === 'secondary') {
    buttonStyles.push(styles.btnSecondary);
    textStyles.push(styles.btnTextSecondary);
  } else if (type === 'success') {
    buttonStyles.push(styles.btnSuccess);
  } else if (type === 'danger') {
    buttonStyles.push(styles.btnDanger);
  } else if (type === 'warning') {
    buttonStyles.push(styles.btnWarning);
  }

  if (disabled || loading) {
    buttonStyles.push(styles.btnDisabled);
  }

  return (
    <TouchableOpacity
      style={[buttonStyles, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={type === 'secondary' ? '#0052cc' : '#ffffff'} size="small" />
      ) : (
        <>
          {icon || null}
          <Text style={[textStyles, textStyle, icon ? { marginLeft: 8 } : null]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginVertical: 6,
  },
  btnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  btnPrimary: {
    backgroundColor: '#0052cc',
  },
  btnSecondary: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#0052cc',
  },
  btnTextSecondary: {
    color: '#0052cc',
  },
  btnSuccess: {
    backgroundColor: '#28a745',
  },
  btnDanger: {
    backgroundColor: '#dc3545',
  },
  btnWarning: {
    backgroundColor: '#ffc107',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
