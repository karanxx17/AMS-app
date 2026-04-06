import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';
import { api } from '../services/api';

const LoginScreen = ({ onLogin }: { onLogin: () => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
  if (!email || !password) {
    Alert.alert('Error', 'Please enter email and password');
    return;
  }
  setLoading(true);
  try {
    const data = await api.login(email, password);
    const token = data?.data?.token;
    if (token) {
      await AsyncStorage.setItem('token', token);
      onLogin();
    } else {
      Alert.alert('Error', 'Invalid credentials');
    }
  } catch (e) {
    Alert.alert('Error', 'Network error. Please try again.');
  } finally {
    setLoading(false);
  }
};

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>AttendPay</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Sign In</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: colors.bg,
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  card: {
    width: '100%', backgroundColor: colors.card,
    borderRadius: 16, padding: 24,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  title: {
    fontSize: 28, fontWeight: '800', color: colors.text,
    textAlign: 'center', marginBottom: 6,
  },
  subtitle: {
    fontSize: 14, color: colors.textSecondary,
    textAlign: 'center', marginBottom: 28,
  },
  input: {
    backgroundColor: '#1e293b', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    color: colors.text, fontSize: 15,
    marginBottom: 14, borderWidth: 1, borderColor: colors.cardBorder,
  },
  btn: {
    backgroundColor: colors.primary, borderRadius: 10,
    paddingVertical: 14, alignItems: 'center', marginTop: 8,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

export default LoginScreen;