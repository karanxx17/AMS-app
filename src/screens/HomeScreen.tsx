import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── THEME ───────────────────────────────────────────────────────────
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
  successBar:  ['#22c55e', '#4ade80'],
  dangerBar:   ['#ef4444', '#f87171'],
  amberBar:    ['#f59e0b', '#fbbf24'],
};

const PIE_COLORS = ['#22c55e', '#ef4444', '#f59e0b'];
const { width: SW } = Dimensions.get('window');

// ─── HELPERS ─────────────────────────────────────────────────────────
const fmt2 = (n: number) => n.toString().padStart(2, '0');

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

const fmtTime = (iso: string) =>
  iso
    ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : '—';

// ─── API ─────────────────────────────────────────────────────────────
const BASE_URL = 'https://attandance-management-payroll-1.onrender.com/api/v1';

const apiGet = async (path: string) => {
  const token = await AsyncStorage.getItem('token');
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  return res.json();
};

// ─── ANIMATED COUNTER ────────────────────────────────────────────────
function Counter({ target }: { target: number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!target) { setVal(0); return; }
    let cur = 0;
    const step = Math.ceil(target / 30);
    const id = setInterval(() => {
      cur += step;
      if (cur >= target) { setVal(target); clearInterval(id); }
      else setVal(cur);
    }, 30);
    return () => clearInterval(id);
  }, [target]);
  return <Text style={styles.metricValue}>{val}</Text>;
}

// ─── METRIC CARD ─────────────────────────────────────────────────────
function MetricCard({
  label, value, icon, accent, delay = 0,
}: {
  label: string; value: number; icon: string;
  accent: 'blue' | 'green' | 'red' | 'amber'; delay?: number;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, delay, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const c = C[accent];
  return (
    <Animated.View
      style={[
        styles.metricCard,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={[styles.metricIcon, { backgroundColor: c.bg, borderColor: c.border }]}>
        <Text style={{ fontSize: 16 }}>{icon}</Text>
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Counter target={value ?? 0} />
    </Animated.View>
  );
}

// ─── SECTION HEADING ─────────────────────────────────────────────────
function SectionHeading({ children }: { children: string }) {
  return <Text style={styles.sectionHeading}>{children}</Text>;
}

// ─── MINI BAR CHART ──────────────────────────────────────────────────
function BarChart({ data }: { data: { name: string; value: number; color: string }[] }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const barW = (SW - 80) / data.length - 16;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12, height: 120, marginTop: 8 }}>
      {data.map((d, i) => {
        const h = Math.max((d.value / max) * 100, 4);
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
            <Text style={styles.barVal}>{d.value}</Text>
            <View style={[styles.barTrack]}>
              <View style={[styles.barFill, { height: `${h}%`, backgroundColor: d.color }]} />
            </View>
            <Text style={styles.barLabel}>{d.name}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── DONUT CHART (pure RN, no library) ───────────────────────────────
function DonutChart({ data }: { data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const SIZE = 110;
  const R = 40;
  const STROKE = 16;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const circumference = 2 * Math.PI * R;

  // Build arc segments using SVG via react-native-svg if available,
  // otherwise fall back to visual representation with colored segments
  let cumulative = 0;
  const segments = data.map((d, i) => {
    const pct = total ? d.value / total : 0;
    const dash = pct * circumference;
    const offset = cumulative * circumference;
    cumulative += pct;
    return { ...d, dash, offset, pct };
  });

  // Simple visual fallback: stacked horizontal bars as "donut proxy"
  return (
    <View style={{ alignItems: 'center', gap: 12 }}>
      {/* Ring proxy – segmented rounded bar */}
      <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
        <View style={styles.ringOuter}>
          {segments.map((s, i) => (
            <View
              key={i}
              style={{
                flex: s.pct,
                backgroundColor: s.color,
                marginHorizontal: 1,
                borderRadius: 3,
                minWidth: s.pct > 0 ? 4 : 0,
              }}
            />
          ))}
        </View>
        <Text style={styles.ringCenter}>{total}</Text>
        <Text style={styles.ringCenterLabel}>Total</Text>
      </View>
      {/* Legend */}
      <View style={{ gap: 8, width: '100%' }}>
        {data.map((d, i) => (
          <View key={i} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: d.color }]} />
            <Text style={styles.legendLabel}>{d.name}</Text>
            <Text style={styles.legendVal}>{d.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── PROGRESS ROW ────────────────────────────────────────────────────
function AttendanceRow({
  label, value, total, color,
}: {
  label: string; value: number; total: number; color: string;
}) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: pct, duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  const animWidth = widthAnim.interpolate({
    inputRange: [0, 100], outputRange: ['0%', '100%'],
  });

  return (
    <View style={{ marginBottom: 16 }}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text style={styles.progressVal}>
          {value}{' '}
          <Text style={styles.progressPct}>({pct}%)</Text>
        </Text>
      </View>
      <View style={styles.progressTrack}>
        <Animated.View
          style={[styles.progressFill, { width: animWidth, backgroundColor: color }]}
        />
      </View>
    </View>
  );
}

// ─── EMPLOYEE STATUS PANEL ───────────────────────────────────────────
const STATUS_TABS = [
  { key: 'present', label: 'Present', icon: '✅', color: '#22c55e', bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.3)' },
  { key: 'absent',  label: 'Absent',  icon: '❌', color: '#f87171', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.3)' },
  { key: 'late',    label: 'Late',    icon: '⏰', color: '#fbbf24', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
];

function EmployeeStatusPanel({
  todayRecords,
  loadingRecords,
}: {
  todayRecords: any[];
  loadingRecords: boolean;
}) {
  const [activeTab, setActiveTab] = useState('present');

  const counts = {
    present: todayRecords.filter(r => r.status === 'present').length,
    absent:  todayRecords.filter(r => r.status === 'absent').length,
    late:    todayRecords.filter(r => r.status === 'late').length,
  };

  const byStatus = todayRecords.filter(r => r.status === activeTab);
  const activeConf = STATUS_TABS.find(t => t.key === activeTab)!;

  return (
    <View style={styles.panelCard}>
      {/* Tab bar */}
      <View style={styles.tabBar}>
        {STATUS_TABS.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[
                styles.tab,
                isActive && { backgroundColor: tab.bg, borderBottomColor: tab.color },
              ]}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 13 }}>{tab.icon}</Text>
              <Text style={[styles.tabLabel, isActive && { color: tab.color, fontWeight: '700' }]}>
                {tab.label}
              </Text>
              <View style={[
                styles.tabBadge,
                isActive && { backgroundColor: `${tab.color}22`, borderColor: `${tab.color}44` },
              ]}>
                <Text style={[styles.tabBadgeText, isActive && { color: tab.color }]}>
                  {(counts as any)[tab.key] ?? 0}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      {loadingRecords ? (
        <View style={styles.panelEmpty}>
          <ActivityIndicator color={C.indigo} />
        </View>
      ) : byStatus.length === 0 ? (
        <View style={styles.panelEmpty}>
          <Text style={styles.panelEmptyText}>No {activeTab} employees today</Text>
        </View>
      ) : (
        <View>
          {byStatus.map((record: any, idx: number) => (
            <View
              key={record._id ?? idx}
              style={[
                styles.employeeRow,
                idx < byStatus.length - 1 && styles.employeeRowBorder,
              ]}
            >
              {/* Avatar */}
              <View style={[
                styles.avatar,
                { backgroundColor: `${activeConf.color}18`, borderColor: `${activeConf.color}33` },
              ]}>
                <Text style={[styles.avatarText, { color: activeConf.color }]}>
                  {record.employee?.name?.charAt(0)?.toUpperCase() ?? '?'}
                </Text>
              </View>

              {/* Name + dept */}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.empName} numberOfLines={1}>
                  {record.employee?.name ?? '—'}
                </Text>
                <Text style={styles.empDept} numberOfLines={1}>
                  {record.employee?.department ?? '—'}
                </Text>
              </View>

              {/* Time */}
              <View style={{ alignItems: 'flex-end' }}>
                {activeTab !== 'absent' && record.checkIn?.time ? (
                  <Text style={[
                    styles.checkInTime,
                    { color: activeTab === 'late' ? '#fbbf24' : '#4ade80' },
                  ]}>
                    {fmtTime(record.checkIn.time)}
                  </Text>
                ) : activeTab === 'late' && record.lateByMinutes ? (
                  <View style={styles.lateBadge}>
                    <Text style={styles.lateBadgeText}>+{record.lateByMinutes}m</Text>
                  </View>
                ) : (
                  <Text style={styles.dashText}>—</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── QUICK ACTION PILL ───────────────────────────────────────────────
function ActionPill({
  label, icon, color, onPress,
}: {
  label: string; icon: string;
  color: 'indigo' | 'green' | 'amber'; onPress?: () => void;
}) {
  const configs = {
    indigo: { bg: 'rgba(99,102,241,0.1)',  border: 'rgba(99,102,241,0.3)',  text: '#a5b4fc' },
    green:  { bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.3)',   text: '#86efac' },
    amber:  { bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.3)',  text: '#fcd34d' },
  };
  const c = configs[color];
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[styles.pill, { backgroundColor: c.bg, borderColor: c.border }]}
    >
      <Text style={{ fontSize: 15 }}>{icon}</Text>
      <Text style={[styles.pillLabel, { color: c.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── MAIN SCREEN ─────────────────────────────────────────────────────
interface Props {
  onLogout?: () => void;
  userName?: string;
  isAdmin?: boolean;
  isHR?: boolean;
}

export default function HomeScreen({ onLogout, userName = 'Admin', isAdmin = true, isHR = false }: Props) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [todayRecords, setTodayRecords] = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Stats
  useEffect(() => {
    if (!(isAdmin || isHR)) { setLoading(false); return; }
    (async () => {
      try {
        const [summaryRes, empRes] = await Promise.all([
          apiGet('/attendance/today-summary'),
          apiGet('/employees?limit=1'),
        ]);
        setStats({
          ...(summaryRes?.data ?? summaryRes),
          totalEmployees: empRes?.data?.pagination?.total ?? 0,
        });
      } catch {
        // handle error
      } finally {
        setLoading(false);
      }
    })();
  }, [isAdmin, isHR]);

  // Today's per-employee records
  useEffect(() => {
    if (!(isAdmin || isHR)) return;
    setLoadingRecords(true);
    const today = new Date().toISOString().split('T')[0];
    apiGet(`/attendance?date=${today}&limit=200`)
      .then(res => setTodayRecords(res?.data?.records ?? res?.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingRecords(false));
  }, [isAdmin, isHR]);

  const pieData = stats ? [
    { name: 'Present', value: stats.presentToday ?? 0, color: '#22c55e' },
    { name: 'Absent',  value: stats.absentToday  ?? 0, color: '#ef4444' },
    { name: 'Late',    value: stats.lateToday    ?? 0, color: '#f59e0b' },
  ] : [];
  const pieTotal = pieData.reduce((s, d) => s + d.value, 0);

  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const hh = fmt2(now.getHours());
  const mm = fmt2(now.getMinutes());
  const ss = fmt2(now.getSeconds());
  const timeStr = `${hh}:${mm}:${ss}`;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ── GRID BACKGROUND OVERLAY ── */}
      <View style={styles.gridOverlay} pointerEvents="none" />

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.dateLine}>{dateStr}</Text>
          <Text style={styles.greetingLine}>
            {getGreeting()},{' '}
            <Text style={styles.greetingAccent}>{userName.split(' ')[0]}</Text>
          </Text>
          <Text style={styles.tagline}>Here's your workforce snapshot for today.</Text>
        </View>
        <View style={styles.clockBox}>
          <Text style={styles.clockTime}>{timeStr}</Text>
          <Text style={styles.liveTag}>● LIVE</Text>
        </View>
      </View>

      {(isAdmin || isHR) && !loading && stats && (
        <>
          {/* ── METRICS ── */}
          <View style={styles.section}>
            <SectionHeading>Today's overview</SectionHeading>
            <View style={styles.metricsGrid}>
              <MetricCard label="Total Employees" value={stats.totalEmployees} icon="👥" accent="blue"  delay={0}   />
              <MetricCard label="Present Today"   value={stats.presentToday}   icon="✅" accent="green" delay={80}  />
              <MetricCard label="Absent Today"    value={stats.absentToday}    icon="❌" accent="red"   delay={160} />
              <MetricCard label="Late Arrivals"   value={stats.lateToday}      icon="⏰" accent="amber" delay={240} />
            </View>
          </View>

          {/* ── CHARTS ROW ── */}
          <View style={styles.section}>
            <SectionHeading>Attendance breakdown</SectionHeading>
            <View style={styles.chartsRow}>
              {/* Donut */}
              <View style={[styles.chartCard, { flex: 1 }]}>
                <Text style={styles.chartTitle}>Distribution</Text>
                <DonutChart data={pieData} />
              </View>
              {/* Bar */}
              <View style={[styles.chartCard, { flex: 1 }]}>
                <Text style={styles.chartTitle}>Bar View</Text>
                <BarChart data={pieData} />
              </View>
            </View>
          </View>

          {/* ── PROGRESS ── */}
          <View style={styles.section}>
            <SectionHeading>Attendance rate</SectionHeading>
            <View style={styles.progressCard}>
              <AttendanceRow label="Present" value={stats.presentToday ?? 0} total={pieTotal} color="#22c55e" />
              <AttendanceRow label="Absent"  value={stats.absentToday  ?? 0} total={pieTotal} color="#ef4444" />
              <AttendanceRow label="Late"    value={stats.lateToday    ?? 0} total={pieTotal} color="#f59e0b" />
            </View>
          </View>

          {/* ── EMPLOYEE STATUS ── */}
          <View style={styles.section}>
            <SectionHeading>Who's present · absent · late</SectionHeading>
            <EmployeeStatusPanel
              todayRecords={todayRecords}
              loadingRecords={loadingRecords}
            />
          </View>
        </>
      )}

      {loading && (isAdmin || isHR) && (
        <View style={{ alignItems: 'center', marginTop: 48 }}>
          <ActivityIndicator color={C.indigo} size="large" />
        </View>
      )}

      {/* ── QUICK ACTIONS ── */}
      <View style={styles.section}>
        <SectionHeading>Quick actions</SectionHeading>
        <View style={styles.actionsCard}>
          <Text style={styles.actionsHint}>Jump to a section</Text>
          <View style={styles.pillsRow}>
            <ActionPill label="Mark Attendance" icon="🗓️" color="indigo" />
            <ActionPill label="Apply Leave"     icon="🌿" color="green"  />
            <ActionPill label="View Payslips"   icon="💳" color="amber"  />
          </View>
        </View>
      </View>

    </ScrollView>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  gridOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    opacity: 0.6,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 36,
  },
  dateLine: {
    fontSize: 11,
    color: C.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  greetingLine: {
    fontSize: 26,
    fontWeight: '800',
    color: C.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  greetingAccent: {
    color: '#818cf8',
  },
  tagline: {
    fontSize: 13,
    color: C.textMuted,
  },
  clockBox: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 12,
    alignItems: 'flex-end',
    minWidth: 110,
  },
  clockTime: {
    fontSize: 20,
    fontWeight: '800',
    color: C.textPrimary,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  liveTag: {
    fontSize: 10,
    color: '#4ade80',
    letterSpacing: 0.5,
    marginTop: 2,
    fontWeight: '600',
  },

  // Section
  section: {
    marginBottom: 28,
  },
  sectionHeading: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.28)',
    marginBottom: 12,
  },

  // Metrics
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    width: '47%',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    padding: 18,
    overflow: 'hidden',
  },
  metricIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 12,
  },
  metricLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.38)',
    fontWeight: '600',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -1,
    lineHeight: 36,
  },

  // Charts
  chartsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  chartCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    padding: 16,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },

  // Donut
  ringOuter: {
    width: 90,
    height: 18,
    flexDirection: 'row',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  ringCenter: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  ringCenterLabel: {
    fontSize: 10,
    color: C.textMuted,
    marginTop: 0,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 99,
  },
  legendLabel: {
    flex: 1,
    fontSize: 11,
    color: 'rgba(255,255,255,0.42)',
  },
  legendVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },

  // Bar chart
  barVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  barTrack: {
    flex: 1,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
  barLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
  },

  // Progress
  progressCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    padding: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  progressVal: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '700',
  },
  progressPct: {
    color: 'rgba(255,255,255,0.28)',
    fontWeight: '400',
  },
  progressTrack: {
    height: 5,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
  },

  // Panel
  panelCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    overflow: 'hidden',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: 2,
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 11,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.35)',
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.3)',
  },
  panelEmpty: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  panelEmptyText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.2)',
  },
  employeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  employeeRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
  },
  empName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  empDept: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 2,
  },
  checkInTime: {
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  lateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
  },
  lateBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fbbf24',
  },
  dashText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.18)',
  },

  // Actions
  actionsCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    padding: 20,
    gap: 14,
  },
  actionsHint: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.38)',
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});