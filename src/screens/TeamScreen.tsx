import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── THEME ────────────────────────────────────────────────────────────
const C = {
  bg:          '#0a0a0f',
  card:        'rgba(255,255,255,0.03)',
  border:      'rgba(255,255,255,0.07)',
  textPrimary: '#ffffff',
  textMuted:   'rgba(255,255,255,0.32)',
  textGhost:   'rgba(255,255,255,0.18)',
  indigo:      { bg: 'rgba(99,102,241,0.12)',  text: '#818cf8', border: 'rgba(99,102,241,0.25)' },
  green:       { bg: 'rgba(34,197,94,0.12)',   text: '#4ade80', border: 'rgba(34,197,94,0.25)' },
  red:         { bg: 'rgba(239,68,68,0.12)',   text: '#f87171', border: 'rgba(239,68,68,0.25)' },
  amber:       { bg: 'rgba(245,158,11,0.12)',  text: '#fbbf24', border: 'rgba(245,158,11,0.25)' },
  purple:      { bg: 'rgba(168,85,247,0.12)',  text: '#c084fc', border: 'rgba(168,85,247,0.25)' },
};

const { width: SW } = Dimensions.get('window');

// ─── TYPES ────────────────────────────────────────────────────────────
interface Employee {
  _id: string;
  name: string;
  role?: string;
  department?: string;
  email?: string;
  phone?: string;
  status?: 'present' | 'absent' | 'late';
  joinDate?: string;
  employeeId?: string;
}

// ─── API ──────────────────────────────────────────────────────────────
const BASE_URL = 'https://attandance-management-payroll-1.onrender.com/api/v1';

const apiGet = async (path: string) => {
  const token = await AsyncStorage.getItem('token');
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  return res.json();
};

// ─── HELPERS ──────────────────────────────────────────────────────────
const getStatusConf = (status?: string) => {
  if (status === 'present') return { ...C.green, label: 'Present', icon: '✓' };
  if (status === 'late')    return { ...C.amber, label: 'Late',    icon: '⏰' };
  if (status === 'absent')  return { ...C.red,   label: 'Absent',  icon: '✕' };
  return { ...C.indigo, label: 'N/A', icon: '—' };
};

// Avatar accent colors cycling
const AVATAR_ACCENTS = [
  C.indigo, C.green, C.amber, C.purple, C.red,
];
const getAvatarAccent = (name: string) =>
  AVATAR_ACCENTS[name.charCodeAt(0) % AVATAR_ACCENTS.length];

// ─── SECTION HEADING ─────────────────────────────────────────────────
function SectionHeading({ children }: { children: React.ReactNode }) {
  return <Text style={s.sectionHeading}>{children}</Text>;
}

// ─── STAT PILL ───────────────────────────────────────────────────────
function StatPill({
  label, value, accent, delay = 0,
}: {
  label: string; value: number;
  accent: keyof typeof C; delay?: number;
}) {
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 450, delay, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 450, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const c = C[accent] as { bg: string; text: string; border: string };
  return (
    <Animated.View
      style={[s.statPill, {
        opacity: fade, transform: [{ translateY: slide }],
        backgroundColor: c.bg, borderColor: c.border,
      }]}
    >
      <Text style={[s.statValue, { color: c.text }]}>{value}</Text>
      <Text style={[s.statLabel, { color: c.text + 'aa' }]}>{label}</Text>
    </Animated.View>
  );
}

// ─── SEARCH BAR ───────────────────────────────────────────────────────
function SearchBar({
  value, onChange,
}: {
  value: string; onChange: (t: string) => void;
}) {
  return (
    <View style={s.searchWrap}>
      <Text style={s.searchIcon}>🔍</Text>
      <TextInput
        style={s.searchInput}
        placeholder="Search by name, role or department…"
        placeholderTextColor="rgba(255,255,255,0.2)"
        value={value}
        onChangeText={onChange}
        autoCapitalize="none"
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChange('')} activeOpacity={0.7}>
          <Text style={s.searchClear}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── FILTER TABS ──────────────────────────────────────────────────────
const FILTERS = [
  { key: 'all',     label: 'All',     accent: 'indigo' as keyof typeof C },
  { key: 'present', label: 'Present', accent: 'green'  as keyof typeof C },
  { key: 'late',    label: 'Late',    accent: 'amber'  as keyof typeof C },
  { key: 'absent',  label: 'Absent',  accent: 'red'    as keyof typeof C },
];

function FilterTabs({
  active, onChange, counts,
}: {
  active: string;
  onChange: (k: string) => void;
  counts: Record<string, number>;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.filterRow}
    >
      {FILTERS.map(f => {
        const isActive = active === f.key;
        const c = C[f.accent] as { bg: string; text: string; border: string };
        return (
          <TouchableOpacity
            key={f.key}
            onPress={() => onChange(f.key)}
            activeOpacity={0.75}
            style={[
              s.filterTab,
              isActive && { backgroundColor: c.bg, borderColor: c.border },
            ]}
          >
            <Text style={[s.filterLabel, isActive && { color: c.text, fontWeight: '700' }]}>
              {f.label}
            </Text>
            {counts[f.key] > 0 && (
              <View style={[
                s.filterBadge,
                isActive && { backgroundColor: c.bg, borderColor: c.border },
              ]}>
                <Text style={[s.filterBadgeText, isActive && { color: c.text }]}>
                  {counts[f.key]}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ─── EMPLOYEE CARD ───────────────────────────────────────────────────
function EmployeeCard({ emp, index }: { emp: Employee; index: number }) {
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    const delay = index * 55;
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 400, delay, useNativeDriver: true }),
    ]).start();
  }, [index]);

  const ac     = getAvatarAccent(emp.name ?? 'A');
  const status = getStatusConf(emp.status);

  return (
    <Animated.View style={[{ opacity: fade, transform: [{ translateY: slide }] }]}>
      <TouchableOpacity style={s.empCard} activeOpacity={0.75}>
        {/* Avatar */}
        <View style={[s.avatar, { backgroundColor: ac.bg, borderColor: ac.border }]}>
          <Text style={[s.avatarText, { color: ac.text }]}>
            {emp.name?.charAt(0)?.toUpperCase() ?? '?'}
          </Text>
        </View>

        {/* Info */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.empName} numberOfLines={1}>{emp.name ?? '—'}</Text>
          <View style={s.empMetaRow}>
            {emp.role && (
              <Text style={s.empRole} numberOfLines={1}>{emp.role}</Text>
            )}
            {emp.role && emp.department && (
              <Text style={s.empDot}>·</Text>
            )}
            {emp.department && (
              <Text style={s.empDept} numberOfLines={1}>{emp.department}</Text>
            )}
          </View>
          {emp.employeeId && (
            <Text style={s.empId}>ID: {emp.employeeId}</Text>
          )}
        </View>

        {/* Status badge */}
        <View style={[s.statusBadge, {
          backgroundColor: status.bg,
          borderColor: status.border,
        }]}>
          <Text style={[s.statusIcon, { color: status.text }]}>{status.icon}</Text>
          <Text style={[s.statusLabel, { color: status.text }]}>{status.label}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────
function EmptyState({ query }: { query: string }) {
  return (
    <View style={s.emptyWrap}>
      <View style={s.emptyIconWrap}>
        <Text style={s.emptyIcon}>👥</Text>
      </View>
      <Text style={s.emptyTitle}>
        {query ? `No results for "${query}"` : 'No employees found'}
      </Text>
      <Text style={s.emptySubtitle}>
        {query ? 'Try a different name, role, or department.' : 'Employees will appear here once added.'}
      </Text>
    </View>
  );
}

// ─── MAIN SCREEN ─────────────────────────────────────────────────────
interface Props {
  onLogout?: () => void;
}

export default function TeamScreen({ onLogout }: Props) {
  // ✅ All hooks unconditionally at the top
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading]     = useState(true);
  const [query, setQuery]         = useState('');
  const [filter, setFilter]       = useState('all');
  const headerFade  = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(headerSlide, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        // Fetch employees + today's attendance to merge status
        const [empRes, attRes] = await Promise.all([
          apiGet('/employees?limit=200'),
          apiGet(`/attendance?date=${new Date().toISOString().split('T')[0]}&limit=200`),
        ]);

        const emps: Employee[] = empRes?.data?.employees ?? empRes?.data ?? [];
        const records: any[]   = attRes?.data?.records   ?? attRes?.data ?? [];

        // Merge attendance status into each employee
        const statusMap: Record<string, string> = {};
        records.forEach((r: any) => {
          if (r.employee?._id) statusMap[r.employee._id] = r.status;
        });

        setEmployees(emps.map(e => ({
          ...e,
          status: (statusMap[e._id] as any) ?? undefined,
        })));
      } catch {
        // handle error
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Counts
  const counts = {
    all:     employees.length,
    present: employees.filter(e => e.status === 'present').length,
    late:    employees.filter(e => e.status === 'late').length,
    absent:  employees.filter(e => e.status === 'absent').length,
  };

  // Filter + search
  const filtered = employees.filter(e => {
    const matchFilter = filter === 'all' || e.status === filter;
    const q = query.toLowerCase();
    const matchQuery  = !q
      || e.name?.toLowerCase().includes(q)
      || e.role?.toLowerCase().includes(q)
      || e.department?.toLowerCase().includes(q)
      || e.employeeId?.toLowerCase().includes(q);
    return matchFilter && matchQuery;
  });

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.scroll}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── HEADER ── */}
      <Animated.View
        style={[s.header, { opacity: headerFade, transform: [{ translateY: headerSlide }] }]}
      >
        <Text style={s.headerEyebrow}>PEOPLE MODULE</Text>
        <Text style={s.headerTitle}>Team</Text>
        <Text style={s.headerSub}>All employees and their attendance status.</Text>
      </Animated.View>

      {/* ── STAT PILLS ── */}
      <View style={s.statsRow}>
        <StatPill label="Total"   value={counts.all}     accent="indigo" delay={0}   />
        <StatPill label="Present" value={counts.present} accent="green"  delay={70}  />
        <StatPill label="Late"    value={counts.late}    accent="amber"  delay={140} />
        <StatPill label="Absent"  value={counts.absent}  accent="red"    delay={210} />
      </View>

      {/* ── SEARCH ── */}
      <View style={s.section}>
        <SearchBar value={query} onChange={setQuery} />
      </View>

      {/* ── FILTER TABS ── */}
      <View style={s.section}>
        <FilterTabs active={filter} onChange={setFilter} counts={counts} />
      </View>

      {/* ── EMPLOYEE LIST ── */}
      <View style={s.section}>
        <SectionHeading>
          {`${filtered.length} ${filter === 'all' ? 'employee' : filter}${filtered.length !== 1 ? 's' : ''}`}
        </SectionHeading>

        {loading ? (
          <View style={s.skeletonWrap}>
            {[0, 1, 2, 3, 4].map(i => (
              <View key={i} style={[s.skeleton, { opacity: 1 - i * 0.18 }]} />
            ))}
          </View>
        ) : filtered.length === 0 ? (
          <EmptyState query={query} />
        ) : (
          filtered.map((emp, idx) => (
            <EmployeeCard key={emp._id} emp={emp} index={idx} />
          ))
        )}
      </View>
    </ScrollView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20, paddingBottom: 100 },

  // Header
  header:        { marginBottom: 24 },
  headerEyebrow: {
    fontSize: 10, fontWeight: '700', letterSpacing: 1.5,
    textTransform: 'uppercase', color: C.indigo.text, marginBottom: 6,
  },
  headerTitle: {
    fontSize: 28, fontWeight: '800', color: C.textPrimary,
    letterSpacing: -0.6, marginBottom: 6,
  },
  headerSub: { fontSize: 13, color: C.textMuted },

  // Stats
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  statPill: {
    flex: 1, alignItems: 'center', paddingVertical: 12,
    borderRadius: 14, borderWidth: 1,
  },
  statValue: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  statLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 0.4, marginTop: 2 },

  // Section
  section: { marginBottom: 16 },
  sectionHeading: {
    fontSize: 10, fontWeight: '700', letterSpacing: 1.2,
    textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)',
    marginBottom: 12,
  },

  // Search
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.card,
    borderRadius: 16, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  searchIcon:  { fontSize: 14 },
  searchInput: {
    flex: 1, fontSize: 14,
    color: C.textPrimary,
    paddingVertical: 0,
  },
  searchClear: { fontSize: 12, color: C.textMuted, paddingLeft: 4 },

  // Filter tabs
  filterRow: { gap: 8, paddingRight: 4 },
  filterTab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 99, borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  filterLabel:     { fontSize: 12, fontWeight: '500', color: C.textMuted },
  filterBadge: {
    paddingHorizontal: 6, paddingVertical: 1,
    borderRadius: 99, borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'transparent',
  },
  filterBadgeText: { fontSize: 10, fontWeight: '700', color: C.textGhost },

  // Employee card
  empCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 18, borderWidth: 1, borderColor: C.border,
    padding: 14, marginBottom: 10, gap: 12,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 14,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  avatarText:  { fontSize: 16, fontWeight: '800' },
  empName:     { fontSize: 14, fontWeight: '700', color: C.textPrimary, marginBottom: 3 },
  empMetaRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  empRole:     { fontSize: 11, color: C.textMuted },
  empDot:      { fontSize: 11, color: C.textGhost },
  empDept:     { fontSize: 11, color: C.textMuted },
  empId:       { fontSize: 10, color: C.textGhost, marginTop: 2 },

  // Status badge
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 10, borderWidth: 1,
  },
  statusIcon:  { fontSize: 10 },
  statusLabel: { fontSize: 11, fontWeight: '700' },

  // Empty state
  emptyWrap: {
    backgroundColor: C.card, borderRadius: 20,
    borderWidth: 1, borderColor: C.border,
    padding: 40, alignItems: 'center', gap: 10,
  },
  emptyIconWrap: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyIcon:     { fontSize: 22 },
  emptyTitle:    { fontSize: 15, fontWeight: '700', color: C.textPrimary, textAlign: 'center' },
  emptySubtitle: { fontSize: 12, color: C.textMuted, textAlign: 'center', lineHeight: 18 },

  // Skeletons
  skeletonWrap: { gap: 10 },
  skeleton: {
    height: 72, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: C.border,
  },
});