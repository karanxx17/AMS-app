import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

// ─── THEME ────────────────────────────────────────────────────────────
const C = {
  bg:          '#0a0a0f',
  card:        'rgba(255,255,255,0.03)',
  border:      'rgba(255,255,255,0.07)',
  borderFocus: 'rgba(99,102,241,0.5)',
  textPrimary: '#ffffff',
  textMuted:   'rgba(255,255,255,0.32)',
  textGhost:   'rgba(255,255,255,0.18)',
  indigo:      { bg: 'rgba(99,102,241,0.12)', text: '#818cf8', border: 'rgba(99,102,241,0.25)' },
  green:       { bg: 'rgba(34,197,94,0.12)',  text: '#4ade80', border: 'rgba(34,197,94,0.25)' },
  red:         { bg: 'rgba(239,68,68,0.12)',  text: '#f87171', border: 'rgba(239,68,68,0.25)' },
};

const { width: SW, height: SH } = Dimensions.get('window');

// ─── ANIMATED INPUT ───────────────────────────────────────────────────
function AnimatedInput({
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  icon,
  delay = 0,
}: {
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
  icon: string;
  delay?: number;
}) {
  // ✅ All hooks unconditionally at top
  const [focused, setFocused]     = useState(false);
  const [visible, setVisible]     = useState(!secureTextEntry);
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(18)).current;
  const borderAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 500, delay, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 500, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    Animated.timing(borderAnim, {
      toValue: focused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [focused]);

  const borderColor = borderAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [C.border, C.borderFocus],
  });

  const bgColor = borderAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: ['rgba(255,255,255,0.03)', 'rgba(99,102,241,0.06)'],
  });

  return (
    <Animated.View
      style={[
        s.inputWrap,
        { opacity: fade, transform: [{ translateY: slide }] },
      ]}
    >
      <Animated.View style={[s.inputInner, { borderColor, backgroundColor: bgColor }]}>
        <Text style={s.inputIcon}>{icon}</Text>
        <TextInput
          style={s.input}
          placeholder={placeholder}
          placeholderTextColor={C.textGhost}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry && !visible}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {secureTextEntry && (
          <TouchableOpacity onPress={() => setVisible(v => !v)} activeOpacity={0.7}>
            <Text style={s.eyeIcon}>{visible ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </Animated.View>
  );
}

// ─── DOT GRID BACKGROUND ─────────────────────────────────────────────
function DotGrid() {
  const cols = Math.ceil(SW / 28);
  const rows = Math.ceil(SH / 28);
  return (
    <View style={s.dotGrid} pointerEvents="none">
      {Array.from({ length: rows }).map((_, r) => (
        <View key={r} style={s.dotRow}>
          {Array.from({ length: cols }).map((_, c) => (
            <View key={c} style={s.dot} />
          ))}
        </View>
      ))}
    </View>
  );
}

// ─── MAIN SCREEN ─────────────────────────────────────────────────────
interface Props {
  onLogin: () => void;
}

export default function LoginScreen({ onLogin }: Props) {
  // ✅ All hooks unconditionally at top
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);

  const logoFade   = useRef(new Animated.Value(0)).current;
  const logoSlide  = useRef(new Animated.Value(-20)).current;
  const cardFade   = useRef(new Animated.Value(0)).current;
  const cardSlide  = useRef(new Animated.Value(30)).current;
  const btnScale   = useRef(new Animated.Value(1)).current;
  const glowAnim   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo entrance
    Animated.parallel([
      Animated.timing(logoFade,  { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(logoSlide, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();

    // Card entrance (slight delay)
    Animated.parallel([
      Animated.timing(cardFade,  { toValue: 1, duration: 600, delay: 200, useNativeDriver: true }),
      Animated.timing(cardSlide, { toValue: 0, duration: 600, delay: 200, useNativeDriver: true }),
    ]).start();

    // Glow pulse loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2500, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2500, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    // Button press animation
    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.timing(btnScale, { toValue: 1,    duration: 80, useNativeDriver: true }),
    ]).start();

    setLoading(true);
    try {
      const data  = await api.login(email, password);
      const token = data?.data?.token;
      if (token) {
        await AsyncStorage.setItem('token', token);
        onLogin();
      } else {
        Alert.alert('Error', 'Invalid credentials');
      }
    } catch {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: ['rgba(99,102,241,0.06)', 'rgba(99,102,241,0.14)'],
  });

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── DOT GRID BG ── */}
        <DotGrid />

        {/* ── GLOW ORBS ── */}
        <Animated.View style={[s.glowOrb1, { backgroundColor: glowOpacity }]} />
        <View style={s.glowOrb2} />

        {/* ── LOGO AREA ── */}
        <Animated.View
          style={[s.logoArea, { opacity: logoFade, transform: [{ translateY: logoSlide }] }]}
        >
          {/* App icon */}
          <View style={s.appIconWrap}>
            <View style={s.appIconInner}>
              <Text style={s.appIconText}>AP</Text>
            </View>
            <View style={s.appIconGlow} />
          </View>

          <Text style={s.appName}>AttendPay</Text>
          <Text style={s.appTagline}>Workforce · Attendance · Payroll</Text>
        </Animated.View>

        {/* ── LOGIN CARD ── */}
        <Animated.View
          style={[s.card, { opacity: cardFade, transform: [{ translateY: cardSlide }] }]}
        >
          {/* Card header */}
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>Welcome back</Text>
            <Text style={s.cardSubtitle}>Sign in to your account to continue.</Text>
          </View>

          {/* Inputs */}
          <View style={s.inputs}>
            <AnimatedInput
              placeholder="Email address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              icon="✉️"
              delay={350}
            />
            <AnimatedInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              icon="🔒"
              delay={450}
            />
          </View>

          {/* Sign in button */}
          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <TouchableOpacity
              style={[s.btn, loading && s.btnLoading]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <View style={s.btnContent}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={s.btnText}>Signing in…</Text>
                </View>
              ) : (
                <View style={s.btnContent}>
                  <Text style={s.btnText}>Sign In</Text>
                  <Text style={s.btnArrow}>→</Text>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Divider */}
          <View style={s.dividerRow}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>secure login</Text>
            <View style={s.dividerLine} />
          </View>

          {/* Trust badges */}
          <View style={s.trustRow}>
            {[
              { icon: '🔐', label: 'Encrypted' },
              { icon: '☁️', label: 'Cloud sync' },
              { icon: '⚡', label: 'Real-time' },
            ].map(b => (
              <View key={b.label} style={s.trustBadge}>
                <Text style={s.trustIcon}>{b.icon}</Text>
                <Text style={s.trustLabel}>{b.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ── FOOTER ── */}
        <Animated.View style={[s.footer, { opacity: logoFade }]}>
          <Text style={s.footerText}>AttendPay v1.0  ·  © 2026</Text>
        </Animated.View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  scroll: {
    flexGrow: 1, alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24, paddingVertical: 48,
  },

  // Background
  dotGrid: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
  },
  dotRow:  { flexDirection: 'row' },
  dot: {
    width: 1, height: 1, borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    margin: 13.5,
  },
  glowOrb1: {
    position: 'absolute', top: -100, left: -80,
    width: 320, height: 320, borderRadius: 160,
  },
  glowOrb2: {
    position: 'absolute', bottom: -80, right: -80,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: 'rgba(168,85,247,0.05)',
  },

  // Logo
  logoArea: {
    alignItems: 'center', marginBottom: 40,
  },
  appIconWrap: {
    marginBottom: 16, alignItems: 'center', justifyContent: 'center',
  },
  appIconInner: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 1,
  },
  appIconText: {
    fontSize: 24, fontWeight: '900',
    color: '#818cf8', letterSpacing: -0.5,
  },
  appIconGlow: {
    position: 'absolute',
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(99,102,241,0.12)',
    transform: [{ scale: 1.6 }],
  },
  appName: {
    fontSize: 32, fontWeight: '900',
    color: C.textPrimary, letterSpacing: -1,
    marginBottom: 6,
  },
  appTagline: {
    fontSize: 12, color: C.textMuted,
    letterSpacing: 1.2, textTransform: 'uppercase',
    fontWeight: '600',
  },

  // Card
  card: {
    width: '100%',
    backgroundColor: C.card,
    borderRadius: 28, borderWidth: 1, borderColor: C.border,
    padding: 28, marginBottom: 24,
    overflow: 'hidden',
  },
  cardHeader: { marginBottom: 24 },
  cardTitle: {
    fontSize: 22, fontWeight: '800',
    color: C.textPrimary, letterSpacing: -0.4,
    marginBottom: 6,
  },
  cardSubtitle: { fontSize: 13, color: C.textMuted },

  // Inputs
  inputs:   { gap: 12, marginBottom: 24 },
  inputWrap: {},
  inputInner: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, borderWidth: 1,
    paddingHorizontal: 16, paddingVertical: 14,
    gap: 10,
  },
  inputIcon: { fontSize: 16 },
  input: {
    flex: 1, fontSize: 15,
    color: C.textPrimary,
    paddingVertical: 0,
  },
  eyeIcon: { fontSize: 16, paddingLeft: 4 },

  // Button
  btn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#6366f1',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.6)',
    marginBottom: 24,
  },
  btnLoading: { backgroundColor: 'rgba(99,102,241,0.6)' },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnText:    { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.2 },
  btnArrow:   { color: 'rgba(255,255,255,0.7)', fontSize: 18, fontWeight: '300' },

  // Divider
  dividerRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, marginBottom: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  dividerText: {
    fontSize: 10, color: C.textGhost,
    fontWeight: '600', letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  // Trust badges
  trustRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 10,
  },
  trustBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12, paddingVertical: 7,
  },
  trustIcon:  { fontSize: 12 },
  trustLabel: { fontSize: 10, color: C.textGhost, fontWeight: '600' },

  // Footer
  footer:     { alignItems: 'center' },
  footerText: { fontSize: 11, color: C.textGhost, letterSpacing: 0.5 },
});
