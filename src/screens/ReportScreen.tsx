import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
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
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// ─── TYPES ────────────────────────────────────────────────────────────
interface ReportSummary {
  attendanceRate: number;
  totalPresent:   number;
  totalAbsent:    number;
  totalLate:      number;
  totalLeaves:    number;
  pendingLeaves:  number;
  totalPayroll:   number;
  paidCount:      number;
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
const fmtINR = (n: number) =>
  '₹' + (n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const now       = new Date();
const thisMonth = MONTHS[now.getMonth()];
const thisYear  = now.getFullYear();

// ─── SECTION HEADING ─────────────────────────────────────────────────
function SectionHeading({ children }: { children: React.ReactNode }) {
  return <Text style={s.sectionHeading}>{children}</Text>;
}

// ─── ANIMATED COUNTER ────────────────────────────────────────────────
function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!target) { setVal(0); return; }
    let cur = 0;
    const step = Math.ceil(target / 35);
    const id = setInterval(() => {
      cur += step;
      if (cur >= target) { setVal(target); clearInterval(id); }
      else setVal(cur);
    }, 20);
    return () => clearInterval(id);
  }, [target]);
  return (
    <Text style={s.kpiValue}>{val.toLocaleString('en-IN')}{suffix}</Text>
  );
}

// ─── KPI CARD ────────────────────────────────────────────────────────
function KpiCard({
  label, value, suffix, icon, accent, delay = 0,
}: {
  label: string; value: number; suffix?: string; icon: string;
  accent: keyof typeof C; delay?: number;
}) {
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 450, delay, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 450, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const c = C[accent] as { bg: string; text: string; border: string };
  return (
    <Animated.View
      style={[s.kpiCard, { opacity: fade, transform: [{ translateY: slide }],
        backgroundColor: c.bg, borderColor: c.border }]}
    >
      <Text style={s.kpiIcon}>{icon}</Text>
      <Counter target={value} suffix={suffix} />
      <Text style={[s.kpiLabel, { color: c.text + 'bb' }]}>{label}</Text>
    </Animated.View>
  );
}

// ─── RING PROGRESS ───────────────────────────────────────────────────
function RingProgress({ pct, color }: { pct: number; color: string }) {
  const widthAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: pct, duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [pct]);
  const animWidth = widthAnim.interpolate({
    inputRange: [0, 100], outputRange: ['0%', '100%'],
  });
  return (
    <View style={s.ringWrap}>
      <View style={s.ringTrack}>
        <Animated.View style={[s.ringFill, { width: animWidth, backgroundColor: color }]} />
      </View>
      <Text style={[s.ringPct, { color }]}>{pct}%</Text>
    </View>
  );
}

// ─── REPORT CARD ─────────────────────────────────────────────────────
function ReportCard({
  title, subtitle, icon, accent, stats, index, onPress,
}: {
  title: string; subtitle: string; icon: string;
  accent: keyof typeof C;
  stats: { label: string; value: string }[];
  index: number;
  onPress?: () => void;
}) {
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const delay = index * 80;
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 420, delay, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 420, delay, useNativeDriver: true }),
    ]).start();
  }, [index]);

  const c = C[accent] as { bg: string; text: string; border: string };

  return (
    <Animated.View style={[{ opacity: fade, transform: [{ translateY: slide }] }]}>
      <TouchableOpacity
        style={s.reportCard}
        onPress={onPress}
        activeOpacity={0.75}
      >
        {/* Left accent bar */}
        <View style={[s.reportAccent, { backgroundColor: c.text }]} />

        <View style={{ flex: 1 }}>
          {/* Top row */}
          <View style={s.reportTop}>
            <View style={[s.reportIconWrap, { backgroundColor: c.bg, borderColor: c.border }]}>
              <Text style={s.reportIcon}>{icon}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.reportTitle}>{title}</Text>
              <Text style={s.reportSubtitle}>{subtitle}</Text>
            </View>
            <View style={[s.reportArrow, { backgroundColor: c.bg, borderColor: c.border }]}>
              <Text style={[s.reportArrowText, { color: c.text }]}>↗</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={s.reportDivider} />

          {/* Stats row */}
          <View style={s.reportStatsRow}>
            {stats.map((stat, i) => (
              <React.Fragment key={i}>
                <View style={s.reportStat}>
                  <Text style={[s.reportStatValue, { color: c.text }]}>{stat.value}</Text>
                  <Text style={s.reportStatLabel}>{stat.label}</Text>
                </View>
                {i < stats.length - 1 && <View style={s.reportStatDivider} />}
              </React.Fragment>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── MONTH BADGE ─────────────────────────────────────────────────────
function MonthBadge() {
  return (
    <View style={s.monthBadge}>
      <Text style={s.monthBadgeText}>📅  {thisMonth} {thisYear}</Text>
    </View>
  );
}

// ─── MAIN SCREEN ─────────────────────────────────────────────────────
interface Props {
  onLogout?: () => void;
  isAdmin?: boolean;
  isHR?: boolean;
}

export default function ReportScreen({ onLogout, isAdmin = false, isHR = false }: Props) {
  // ✅ All hooks at the top unconditionally
  const [summary, setSummary]   = useState<ReportSummary | null>(null);
  const [loading, setLoading]   = useState(true);
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
        const [attRes, leaveRes, payRes] = await Promise.all([
          apiGet('/attendance/today-summary'),
          apiGet('/leaves?limit=1'),
          apiGet('/payroll?limit=1'),
        ]);

        const att   = attRes?.data  ?? attRes  ?? {};
        const leave = leaveRes?.data ?? leaveRes ?? {};
        const pay   = payRes?.data   ?? payRes   ?? {};

        setSummary({
          attendanceRate: att.attendanceRate   ?? 0,
          totalPresent:   att.presentToday     ?? 0,
          totalAbsent:    att.absentToday      ?? 0,
          totalLate:      att.lateToday        ?? 0,
          totalLeaves:    leave.pagination?.total ?? 0,
          pendingLeaves:  leave.pendingCount   ?? 0,
          totalPayroll:   pay.totalPayroll     ?? 0,
          paidCount:      pay.paidCount        ?? 0,
        });
      } catch {
        // handle error
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const reports = [
    {
      title:    'Attendance Report',
      subtitle: `${thisMonth} ${thisYear} · Daily tracking`,
      icon:     '🗓️',
      accent:   'indigo' as keyof typeof C,
      stats: [
        { label: 'Present',  value: String(summary?.totalPresent ?? '—') },
        { label: 'Absent',   value: String(summary?.totalAbsent  ?? '—') },
        { label: 'Late',     value: String(summary?.totalLate    ?? '—') },
      ],
    },
    {
      title:    'Leave Report',
      subtitle: `${thisMonth} ${thisYear} · All departments`,
      icon:     '🌿',
      accent:   'green' as keyof typeof C,
      stats: [
        { label: 'Total',   value: String(summary?.totalLeaves   ?? '—') },
        { label: 'Pending', value: String(summary?.pendingLeaves ?? '—') },
        { label: 'Rate',    value: summary ? `${Math.round((summary.pendingLeaves / Math.max(summary.totalLeaves, 1)) * 100)}%` : '—' },
      ],
    },
    {
      title:    'Payroll Report',
      subtitle: `${thisMonth} ${thisYear} · Salary disbursement`,
      icon:     '💳',
      accent:   'amber' as keyof typeof C,
      stats: [
        { label: 'Total',    value: summary ? fmtINR(summary.totalPayroll) : '—' },
        { label: 'Paid',     value: String(summary?.paidCount ?? '—') },
        { label: 'Pending',  value: '—' },
      ],
    },
  ];

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* ── HEADER ── */}
      <Animated.View
        style={[s.header, { opacity: headerFade, transform: [{ translateY: headerSlide }] }]}
      >
        <View style={s.headerRow}>
          <View>
            <Text style={s.headerEyebrow}>ANALYTICS MODULE</Text>
            <Text style={s.headerTitle}>Reports</Text>
            <Text style={s.headerSub}>Insights and summaries across all modules.</Text>
          </View>
          <MonthBadge />
        </View>
      </Animated.View>

      {/* ── KPI STRIP ── */}
      {(isAdmin || isHR) && (
        <View style={s.section}>
          <SectionHeading>Today's snapshot</SectionHeading>
          <View style={s.kpiGrid}>
            <KpiCard label="Present"  value={summary?.totalPresent   ?? 0} icon="✅" accent="green"  delay={0}   />
            <KpiCard label="Absent"   value={summary?.totalAbsent    ?? 0} icon="❌" accent="red"    delay={70}  />
            <KpiCard label="Late"     value={summary?.totalLate      ?? 0} icon="⏰" accent="amber"  delay={140} />
            <KpiCard label="Leaves"   value={summary?.totalLeaves    ?? 0} icon="🌿" accent="purple" delay={210} />
          </View>
        </View>
      )}

      {/* ── ATTENDANCE RATE ── */}
      {(isAdmin || isHR) && summary && (
        <View style={s.section}>
          <SectionHeading>Attendance rate</SectionHeading>
          <View style={s.rateCard}>
            <View style={s.rateCardLeft}>
              <Text style={s.rateTitle}>Overall today</Text>
              <Text style={s.rateSub}>Based on scheduled employees</Text>
            </View>
            <RingProgress pct={summary.attendanceRate ?? 0} color="#818cf8" />
          </View>
        </View>
      )}

      {/* ── REPORT CARDS ── */}
      <View style={s.section}>
        <SectionHeading>Module reports</SectionHeading>
        {reports.map((r, idx) => (
          <ReportCard
            key={r.title}
            title={r.title}
            subtitle={r.subtitle}
            icon={r.icon}
            accent={r.accent}
            stats={r.stats}
            index={idx}
          />
        ))}
      </View>

      {/* Loading skeletons */}
      {loading && (
        <View style={s.skeletonWrap}>
          {[0, 1, 2].map(i => (
            <View key={i} style={[s.skeleton, { opacity: 1 - i * 0.25 }]} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20, paddingBottom: 100 },

  // Header
  header:    { marginBottom: 28 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerEyebrow: {
    fontSize: 10, fontWeight: '700', letterSpacing: 1.5,
    textTransform: 'uppercase', color: C.indigo.text, marginBottom: 6,
  },
  headerTitle: {
    fontSize: 28, fontWeight: '800', color: C.textPrimary,
    letterSpacing: -0.6, marginBottom: 6,
  },
  headerSub: { fontSize: 13, color: C.textMuted },

  // Month badge
  monthBadge: {
    backgroundColor: C.indigo.bg,
    borderRadius: 12, borderWidth: 1,
    borderColor: C.indigo.border,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  monthBadgeText: { fontSize: 11, fontWeight: '700', color: C.indigo.text },

  // Section
  section: { marginBottom: 24 },
  sectionHeading: {
    fontSize: 10, fontWeight: '700', letterSpacing: 1.2,
    textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)',
    marginBottom: 12,
  },

  // KPI grid
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: {
    width: (SW - 50) / 2,
    borderRadius: 18, borderWidth: 1,
    padding: 16, gap: 4,
  },
  kpiIcon:  { fontSize: 20, marginBottom: 6 },
  kpiValue: { fontSize: 28, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.8 },
  kpiLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.4 },

  // Rate card
  rateCard: {
    backgroundColor: C.card,
    borderRadius: 20, borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rateCardLeft: { flex: 1 },
  rateTitle:    { fontSize: 15, fontWeight: '700', color: C.textPrimary, marginBottom: 4 },
  rateSub:      { fontSize: 12, color: C.textMuted },

  // Ring progress
  ringWrap:  { alignItems: 'flex-end', gap: 6 },
  ringTrack: {
    width: 120, height: 6, borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden',
  },
  ringFill:  { height: '100%', borderRadius: 99 },
  ringPct:   { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },

  // Report card
  reportCard: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderRadius: 20, borderWidth: 1,
    borderColor: C.border,
    marginBottom: 12, overflow: 'hidden',
    padding: 16, gap: 14,
  },
  reportAccent: { width: 3, borderRadius: 99, alignSelf: 'stretch' },
  reportTop: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, marginBottom: 14,
  },
  reportIconWrap: {
    width: 42, height: 42, borderRadius: 13,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  reportIcon:     { fontSize: 18 },
  reportTitle:    { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  reportSubtitle: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  reportArrow: {
    width: 32, height: 32, borderRadius: 10,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  reportArrowText: { fontSize: 14, fontWeight: '700' },
  reportDivider:   { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: 14 },
  reportStatsRow:  { flexDirection: 'row', alignItems: 'center' },
  reportStat:      { flex: 1, alignItems: 'center' },
  reportStatValue: { fontSize: 18, fontWeight: '800', letterSpacing: -0.4 },
  reportStatLabel: { fontSize: 10, color: C.textMuted, fontWeight: '600', marginTop: 2 },
  reportStatDivider: {
    width: 1, height: 28,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },

  // Skeletons
  skeletonWrap: { gap: 12 },
  skeleton: {
    height: 140, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: C.border,
  },
});