import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '../components/Header';

const BASE_URL = 'https://attandance-management-payroll-1.onrender.com/api/v1';

// ─── THEME (exact match from HomeScreen) ─────────────────────────────
const C = {
  bg:          '#0a0a0f',
  card:        'rgba(255,255,255,0.03)',
  border:      'rgba(255,255,255,0.07)',
  textPrimary: '#ffffff',
  textMuted:   'rgba(255,255,255,0.32)',
  textGhost:   'rgba(255,255,255,0.18)',
  labelMuted:  'rgba(255,255,255,0.38)',
  blue:        { bg: 'rgba(99,102,241,0.12)',  text: '#818cf8', border: 'rgba(99,102,241,0.25)' },
  green:       { bg: 'rgba(34,197,94,0.12)',   text: '#4ade80', border: 'rgba(34,197,94,0.25)' },
  red:         { bg: 'rgba(239,68,68,0.12)',   text: '#f87171', border: 'rgba(239,68,68,0.25)' },
  amber:       { bg: 'rgba(245,158,11,0.12)',  text: '#fbbf24', border: 'rgba(245,158,11,0.25)' },
  indigo:      '#818cf8',
};

// ─── SECTION HEADING ─────────────────────────────────────────────────
function SectionHeading({ children }: { children: string }) {
  return <Text style={styles.sectionHeading}>{children}</Text>;
}

// ─── ANIMATED BRANCH CARD ────────────────────────────────────────────
function BranchCard({
  branch, index, totalEmployees, expanded, onPress,
}: {
  branch: any; index: number; totalEmployees: number;
  expanded: boolean; onPress: () => void;
}) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(18)).current;
  const widthAnim = React.useRef(new Animated.Value(0)).current;

  const empCount = branch.employeeCount ?? branch.employees ?? 0;
  const pct = totalEmployees ? Math.round((empCount / totalEmployees) * 100) : 0;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 500,
        delay: index * 80, useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0, duration: 500,
        delay: index * 80, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  React.useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: pct, duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  const animWidth = widthAnim.interpolate({
    inputRange: [0, 100], outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View style={[
      styles.branchCard,
      expanded && styles.branchCardExpanded,
      { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
    ]}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: C.blue.bg, borderColor: C.blue.border }]}>
            <Text style={{ fontSize: 20 }}>🏢</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.branchName}>{branch.name ?? branch.branchName ?? 'Branch'}</Text>
            <View style={styles.locationRow}>
              <Text style={styles.locationPin}>📍</Text>
              <Text style={styles.locationText}>
                {branch.location ?? branch.city ?? branch.address ?? 'Location not set'}
              </Text>
            </View>
          </View>
          <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
        </View>

        {/* Employee Count */}
        <View style={styles.empRow}>
          <Text style={styles.empCount}>
            <Text style={styles.empCountNum}>{empCount}</Text>
            <Text style={styles.empCountLabel}> employees</Text>
          </Text>
          <Text style={[styles.pctBadge, { color: C.blue.text }]}>{pct}%</Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: animWidth }]} />
        </View>

        {/* Expanded Details */}
        {expanded && (
          <View style={styles.expandedSection}>
            <View style={styles.divider} />
            <View style={styles.detailsGrid}>
              {[
                { label: 'Branch Code', value: branch.code ?? branch.branchCode ?? '—' },
                { label: 'Manager',     value: branch.manager ?? branch.managerName ?? '—' },
                { label: 'Phone',       value: branch.phone ?? branch.contact ?? '—' },
                { label: 'Status',      value: branch.isActive !== false ? 'Active' : 'Inactive' },
              ].map((d, i) => (
                <View key={i} style={styles.detailItem}>
                  <Text style={styles.detailLabel}>{d.label}</Text>
                  <Text style={[
                    styles.detailValue,
                    d.label === 'Status' && {
                      color: d.value === 'Active' ? C.green.text : C.red.text,
                    },
                  ]}>
                    {d.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── MAIN SCREEN ─────────────────────────────────────────────────────
const BranchScreen = ({ onLogout }: { onLogout: () => void }) => {
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${BASE_URL}/branches`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      setBranches(data?.data ?? data?.branches ?? []);
    } catch (e) {
      console.log('Error fetching branches', e);
    } finally {
      setLoading(false);
    }
  };

  const totalEmployees = branches.reduce(
    (s: number, b: any) => s + (b.employeeCount ?? b.employees ?? 0), 0
  );

  return (
    <View style={styles.root}>
      <Header onLogout={onLogout} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>

        {/* ── HEADER ── */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Branches</Text>
          <Text style={styles.pageSubtitle}>Office locations & workforce distribution</Text>
        </View>

        {/* ── METRIC CARDS ── */}
        <View style={styles.section}>
          <SectionHeading>Overview</SectionHeading>
          <View style={styles.metricsGrid}>
            {[
              { label: 'Total Branches',  value: branches.length, icon: '🏢', accent: C.blue  },
              { label: 'Total Employees', value: totalEmployees,  icon: '👥', accent: C.green },
            ].map((m, i) => (
              <View key={i} style={styles.metricCard}>
                <View style={[styles.metricIcon, {
                  backgroundColor: m.accent.bg,
                  borderColor: m.accent.border,
                }]}>
                  <Text style={{ fontSize: 16 }}>{m.icon}</Text>
                </View>
                <Text style={styles.metricLabel}>{m.label}</Text>
                <Text style={[styles.metricValue, { color: m.accent.text }]}>{m.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── BRANCH LIST ── */}
        <View style={styles.section}>
          <SectionHeading>All locations</SectionHeading>

          {loading ? (
            <View style={{ alignItems: 'center', marginTop: 48 }}>
              <ActivityIndicator color={C.indigo} size="large" />
            </View>
          ) : branches.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🏢</Text>
              <Text style={styles.emptyText}>No branches found</Text>
            </View>
          ) : (
            branches.map((b: any, idx: number) => {
              const key = b._id ?? b.id ?? idx.toString();
              return (
                <BranchCard
                  key={key}
                  branch={b}
                  index={idx}
                  totalEmployees={totalEmployees}
                  expanded={expanded === key}
                  onPress={() => setExpanded(expanded === key ? null : key)}
                />
              );
            })
          )}
        </View>

        {/* ── QUICK ACTIONS ── */}
        <View style={styles.section}>
          <SectionHeading>Quick actions</SectionHeading>
          <View style={styles.actionsCard}>
            <Text style={styles.actionsHint}>Manage your branches</Text>
            <View style={styles.pillsRow}>
              {[
                { label: 'Add Branch',     icon: '➕', color: C.blue  },
                { label: 'View Employees', icon: '👥', color: C.green },
                { label: 'Reports',        icon: '📊', color: C.amber },
              ].map((a, i) => (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.75}
                  style={[styles.pill, {
                    backgroundColor: a.color.bg,
                    borderColor: a.color.border,
                  }]}>
                  <Text style={{ fontSize: 15 }}>{a.icon}</Text>
                  <Text style={[styles.pillLabel, { color: a.color.text }]}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

      </ScrollView>
    </View>
  );
};

// ─── STYLES ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20, paddingBottom: 100 },

  pageHeader: { marginBottom: 28 },
  pageTitle: {
    fontSize: 26, fontWeight: '800',
    color: C.textPrimary, letterSpacing: -0.5, marginBottom: 6,
  },
  pageSubtitle: { fontSize: 13, color: C.textMuted },

  section: { marginBottom: 28 },
  sectionHeading: {
    fontSize: 10, fontWeight: '700',
    letterSpacing: 1.2, textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.28)', marginBottom: 12,
  },

  // Metrics
  metricsGrid: { flexDirection: 'row', gap: 12 },
  metricCard: {
    flex: 1, backgroundColor: C.card,
    borderWidth: 1, borderColor: C.border,
    borderRadius: 18, padding: 18,
  },
  metricIcon: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, marginBottom: 12,
  },
  metricLabel: {
    fontSize: 10, color: 'rgba(255,255,255,0.38)',
    fontWeight: '600', letterSpacing: 0.7,
    textTransform: 'uppercase', marginBottom: 4,
  },
  metricValue: {
    fontSize: 32, fontWeight: '800',
    letterSpacing: -1, lineHeight: 36,
  },

  // Branch Card
  branchCard: {
    backgroundColor: C.card,
    borderWidth: 1, borderColor: C.border,
    borderRadius: 20, padding: 18, marginBottom: 12,
  },
  branchCardExpanded: {
    borderColor: 'rgba(99,102,241,0.3)',
    backgroundColor: 'rgba(99,102,241,0.04)',
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center',
    gap: 14, marginBottom: 14,
  },
  iconBox: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  branchName: {
    fontSize: 15, fontWeight: '700',
    color: C.textPrimary, marginBottom: 4,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationPin: { fontSize: 11 },
  locationText: { fontSize: 12, color: C.textMuted },
  chevron: { fontSize: 10, color: C.textGhost },

  // Employee bar
  empRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  empCount: { flexDirection: 'row', alignItems: 'baseline' },
  empCountNum: { fontSize: 20, fontWeight: '800', color: C.textPrimary },
  empCountLabel: { fontSize: 12, color: C.textMuted },
  pctBadge: { fontSize: 13, fontWeight: '700' },
  progressTrack: {
    height: 4, borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%', borderRadius: 99,
    backgroundColor: '#818cf8',
  },

  // Expanded
  expandedSection: { marginTop: 16 },
  divider: { height: 1, backgroundColor: C.border, marginBottom: 16 },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  detailItem: { width: '47%' },
  detailLabel: {
    fontSize: 10, color: C.textGhost,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4,
  },
  detailValue: { fontSize: 13, fontWeight: '600', color: C.textPrimary },

  // Empty
  emptyCard: {
    backgroundColor: C.card, borderRadius: 20,
    padding: 48, alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: C.border,
  },
  emptyIcon: { fontSize: 28, opacity: 0.3 },
  emptyText: { fontSize: 14, color: C.textGhost, fontStyle: 'italic' },

  // Actions
  actionsCard: {
    backgroundColor: C.card, borderWidth: 1,
    borderColor: C.border, borderRadius: 20,
    padding: 20, gap: 14,
  },
  actionsHint: { fontSize: 14, color: 'rgba(255,255,255,0.38)' },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pill: {
    flexDirection: 'row', alignItems: 'center',
    gap: 7, paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 999, borderWidth: 1,
  },
  pillLabel: { fontSize: 13, fontWeight: '600' },
});

export default BranchScreen;