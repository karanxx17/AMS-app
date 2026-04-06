import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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
  indigo:      '#818cf8',
  blue:   { bg: 'rgba(99,102,241,0.12)',  text: '#818cf8', border: 'rgba(99,102,241,0.25)' },
  green:  { bg: 'rgba(34,197,94,0.12)',   text: '#4ade80', border: 'rgba(34,197,94,0.25)' },
  red:    { bg: 'rgba(239,68,68,0.12)',   text: '#f87171', border: 'rgba(239,68,68,0.25)' },
  amber:  { bg: 'rgba(245,158,11,0.12)',  text: '#fbbf24', border: 'rgba(245,158,11,0.25)' },
};

const { width: SW } = Dimensions.get('window');

// ─── TYPES ────────────────────────────────────────────────────────────
interface PayrollData {
  _id: string;
  month: string;
  year: number;
  basicSalary: number;
  hra: number;
  allowances: number;
  deductions: number;
  tax: number;
  netPay: number;
  status: 'paid' | 'pending' | 'processing';
  paidOn?: string;
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

const fmtDate = (iso: string) =>
  iso
    ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// ─── SECTION HEADING ─────────────────────────────────────────────────
function SectionHeading({ children }: { children: React.ReactNode }) {
  return <Text style={s.sectionHeading}>{children}</Text>;
}

// ─── ANIMATED NUMBER ─────────────────────────────────────────────────
function AnimatedNumber({ target, prefix = '₹' }: { target: number; prefix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!target) { setVal(0); return; }
    let cur = 0;
    const step = Math.ceil(target / 40);
    const id = setInterval(() => {
      cur += step;
      if (cur >= target) { setVal(target); clearInterval(id); }
      else setVal(cur);
    }, 20);
    return () => clearInterval(id);
  }, [target]);
  return (
    <Text style={s.netPayValue}>
      {prefix}{val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
    </Text>
  );
}

// ─── STAT CARD ───────────────────────────────────────────────────────
function StatCard({
  label, value, icon, accent, delay = 0,
}: {
  label: string; value: number; icon: string;
  accent: 'blue' | 'green' | 'red' | 'amber'; delay?: number;
}) {
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 450, delay, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 450, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const c = C[accent];
  return (
    <Animated.View
      style={[s.statCard, { opacity: fade, transform: [{ translateY: slide }],
        backgroundColor: c.bg, borderColor: c.border }]}
    >
      <View style={s.statCardTop}>
        <Text style={s.statIcon}>{icon}</Text>
        <Text style={[s.statLabel, { color: c.text + 'bb' }]}>{label}</Text>
      </View>
      <Text style={[s.statValue, { color: c.text }]}>{fmtINR(value)}</Text>
    </Animated.View>
  );
}

// ─── PAYSLIP ROW ─────────────────────────────────────────────────────
function PayslipRow({
  label, value, accent, bold = false, last = false,
}: {
  label: string; value: number;
  accent?: 'green' | 'red'; bold?: boolean; last?: boolean;
}) {
  const textColor = accent === 'green'
    ? C.green.text
    : accent === 'red'
    ? C.red.text
    : C.textPrimary;

  return (
    <>
      <View style={s.payslipRow}>
        <Text style={[s.payslipLabel, bold && { color: C.textPrimary, fontWeight: '700' }]}>
          {label}
        </Text>
        <Text style={[s.payslipValue, { color: textColor }, bold && { fontWeight: '800' }]}>
          {accent === 'red' ? '- ' : ''}{fmtINR(value)}
        </Text>
      </View>
      {!last && <View style={s.rowDivider} />}
    </>
  );
}

// ─── STATUS BADGE ────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; border: string; icon: string }> = {
    paid:       { ...C.green, icon: '✓' },
    pending:    { ...C.amber, icon: '◐' },
    processing: { ...C.blue,  icon: '↻' },
  };
  const conf = map[status] ?? map.pending;
  return (
    <View style={[s.statusBadge, { backgroundColor: conf.bg, borderColor: conf.border }]}>
      <Text style={[s.statusText, { color: conf.text }]}>
        {conf.icon}  {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Pending'}
      </Text>
    </View>
  );
}

// ─── HISTORY CARD ────────────────────────────────────────────────────
function HistoryCard({ item, index }: { item: PayrollData; index: number }) {
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    const delay = index * 60;
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 380, delay, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 380, delay, useNativeDriver: true }),
    ]).start();
  }, [index]);

  return (
    <Animated.View
      style={[s.historyCard, { opacity: fade, transform: [{ translateY: slide }] }]}
    >
      <View style={[s.historyAccent, { backgroundColor: C.indigo }]} />
      <View style={{ flex: 1 }}>
        <View style={s.historyTop}>
          <View>
            <Text style={s.historyMonth}>{item.month} {item.year}</Text>
            {item.paidOn && (
              <Text style={s.historyDate}>Paid on {fmtDate(item.paidOn)}</Text>
            )}
          </View>
          <StatusBadge status={item.status} />
        </View>
        <View style={s.historyBottom}>
          <Text style={s.historyNetLabel}>Net Pay</Text>
          <Text style={s.historyNetValue}>{fmtINR(item.netPay)}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── MAIN SCREEN ─────────────────────────────────────────────────────
interface Props {
  onLogout?: () => void;
}

export default function PayrollScreen({ onLogout }: Props) {
  // ✅ All hooks at the top unconditionally
  const [current, setCurrent]   = useState<PayrollData | null>(null);
  const [history, setHistory]   = useState<PayrollData[]>([]);
  const [loading, setLoading]   = useState(true);
  const headerFade  = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-10)).current;
  const netFade     = useRef(new Animated.Value(0)).current;
  const netScale    = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(headerSlide, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiGet('/payroll/my?limit=12');
        const records: PayrollData[] = res?.data?.payrolls ?? res?.data ?? [];
        if (records.length > 0) {
          setCurrent(records[0]);
          setHistory(records.slice(1));
        }
      } catch {
        // handle error
      } finally {
        setLoading(false);
        Animated.parallel([
          Animated.timing(netFade,  { toValue: 1, duration: 600, delay: 200, useNativeDriver: true }),
          Animated.spring(netScale, { toValue: 1, delay: 200, useNativeDriver: true }),
        ]).start();
      }
    })();
  }, []);

  const now    = new Date();
  const month  = current?.month  ?? MONTHS[now.getMonth()];
  const year   = current?.year   ?? now.getFullYear();
  const gross  = (current?.basicSalary ?? 0) + (current?.hra ?? 0) + (current?.allowances ?? 0);
  const deduct = (current?.deductions  ?? 0) + (current?.tax ?? 0);
  const net    = current?.netPay ?? 0;

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
        <Text style={s.headerEyebrow}>FINANCE MODULE</Text>
        <Text style={s.headerTitle}>Payroll</Text>
        <Text style={s.headerSub}>Your salary breakdown and payment history.</Text>
      </Animated.View>

      {/* ── NET PAY HERO ── */}
      <Animated.View
        style={[s.netPayCard, { opacity: netFade, transform: [{ scale: netScale }] }]}
      >
        {/* Glow ring */}
        <View style={s.glowRing} />

        <View style={s.netPayTop}>
          <View>
            <Text style={s.netPayEyebrow}>NET PAY</Text>
            <Text style={s.netPayPeriod}>{month} {year}</Text>
          </View>
          {current?.status && <StatusBadge status={current.status} />}
        </View>

        <AnimatedNumber target={net} />

        {current?.paidOn && (
          <Text style={s.netPayDate}>Credited on {fmtDate(current.paidOn)}</Text>
        )}

        {/* Mini progress bar: net vs gross */}
        {gross > 0 && (
          <View style={s.netBar}>
            <View style={[s.netBarFill, { width: `${Math.round((net / gross) * 100)}%` }]} />
          </View>
        )}
        {gross > 0 && (
          <Text style={s.netBarLabel}>
            {Math.round((net / gross) * 100)}% of gross salary
          </Text>
        )}
      </Animated.View>

      {/* ── STAT CARDS ── */}
      <View style={s.section}>
        <SectionHeading>Earnings breakdown</SectionHeading>
        <View style={s.statsGrid}>
          <StatCard label="Basic"      value={current?.basicSalary ?? 0} icon="💼" accent="blue"  delay={0}   />
          <StatCard label="HRA" value={current?.hra ?? 0} icon="🏠" accent="blue" delay={70} />
          <StatCard label="Allowances" value={current?.allowances  ?? 0} icon="➕" accent="green" delay={140} />
          <StatCard label="Tax"        value={current?.tax         ?? 0} icon="📋" accent="amber" delay={210} />
        </View>
      </View>

      {/* ── PAYSLIP CARD ── */}
      <View style={s.section}>
        <SectionHeading>This month's payslip</SectionHeading>
        <View style={s.payslipCard}>
          {/* Header */}
          <View style={s.payslipHeader}>
            <Text style={s.payslipTitle}>{month} {year}</Text>
            <Text style={s.payslipSubtitle}>Salary Statement</Text>
          </View>
          <View style={s.payslipDividerThick} />

          {/* Earnings */}
          <Text style={s.payslipSection}>EARNINGS</Text>
          <PayslipRow label="Basic Salary"  value={current?.basicSalary ?? 0} />
          <PayslipRow label="HRA"           value={current?.hra         ?? 0} />
          <PayslipRow label="Allowances"    value={current?.allowances  ?? 0} />

          <View style={s.payslipDividerThick} />

          {/* Deductions */}
          <Text style={s.payslipSection}>DEDUCTIONS</Text>
          <PayslipRow label="Deductions" value={current?.deductions ?? 0} accent="red" />
          <PayslipRow label="Tax (TDS)"  value={current?.tax        ?? 0} accent="red" />

          <View style={s.payslipDividerThick} />

          {/* Net */}
          <PayslipRow label="Gross Earnings" value={gross}  bold />
          <PayslipRow label="Total Deductions" value={deduct} accent="red" bold />
          <View style={[s.netPayRow]}>
            <Text style={s.netPayRowLabel}>NET PAY</Text>
            <Text style={s.netPayRowValue}>{fmtINR(net)}</Text>
          </View>
        </View>
      </View>

      {/* ── HISTORY ── */}
      {history.length > 0 && (
        <View style={s.section}>
          <SectionHeading>Payment history</SectionHeading>
          {history.map((item, idx) => (
            <HistoryCard key={item._id} item={item} index={idx} />
          ))}
        </View>
      )}

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
  header:        { marginBottom: 28 },
  headerEyebrow: {
    fontSize: 10, fontWeight: '700', letterSpacing: 1.5,
    textTransform: 'uppercase', color: C.indigo, marginBottom: 6,
  },
  headerTitle: {
    fontSize: 28, fontWeight: '800', color: C.textPrimary,
    letterSpacing: -0.6, marginBottom: 6,
  },
  headerSub: { fontSize: 13, color: C.textMuted },

  // Net pay hero
  netPayCard: {
    backgroundColor: 'rgba(99,102,241,0.07)',
    borderRadius: 24, borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.2)',
    padding: 24, marginBottom: 28,
    overflow: 'hidden',
  },
  glowRing: {
    position: 'absolute', top: -60, right: -60,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(99,102,241,0.08)',
  },
  netPayTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 16,
  },
  netPayEyebrow: {
    fontSize: 10, fontWeight: '700', letterSpacing: 1.5,
    color: C.indigo, marginBottom: 4,
  },
  netPayPeriod: { fontSize: 13, color: C.textMuted, fontWeight: '500' },
  netPayValue:  {
    fontSize: 44, fontWeight: '800', color: C.textPrimary,
    letterSpacing: -1.5, marginBottom: 8,
  },
  netPayDate: { fontSize: 11, color: C.textMuted, marginBottom: 16 },
  netBar: {
    height: 4, borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden', marginBottom: 6,
  },
  netBarFill: {
    height: '100%', borderRadius: 99,
    backgroundColor: C.indigo,
  },
  netBarLabel: { fontSize: 10, color: C.textGhost, fontWeight: '600' },

  // Section
  section: { marginBottom: 24 },
  sectionHeading: {
    fontSize: 10, fontWeight: '700', letterSpacing: 1.2,
    textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)',
    marginBottom: 12,
  },

  // Stat cards grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    width: (SW - 50) / 2,
    borderRadius: 18, borderWidth: 1,
    padding: 16,
  },
  statCardTop: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, marginBottom: 10,
  },
  statIcon:  { fontSize: 16 },
  statLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
  statValue: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },

  // Payslip card
  payslipCard: {
    backgroundColor: C.card, borderRadius: 20,
    borderWidth: 1, borderColor: C.border,
    overflow: 'hidden',
  },
  payslipHeader: {
    padding: 20, paddingBottom: 16,
    backgroundColor: 'rgba(99,102,241,0.06)',
  },
  payslipTitle:    { fontSize: 16, fontWeight: '800', color: C.textPrimary },
  payslipSubtitle: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  payslipDividerThick: {
    height: 1, backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 4,
  },
  payslipSection: {
    fontSize: 9, fontWeight: '700', letterSpacing: 1.4,
    color: C.textGhost, paddingHorizontal: 20,
    paddingTop: 14, paddingBottom: 4,
  },
  payslipRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 11,
  },
  payslipLabel: { fontSize: 13, color: C.textMuted },
  payslipValue: { fontSize: 13, fontWeight: '600' },
  rowDivider:   { height: 1, backgroundColor: 'rgba(255,255,255,0.03)', marginHorizontal: 20 },

  // Net pay row
  netPayRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center',
    margin: 16, marginTop: 12,
    backgroundColor: 'rgba(99,102,241,0.1)',
    borderRadius: 14, borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.2)',
    paddingHorizontal: 18, paddingVertical: 14,
  },
  netPayRowLabel: {
    fontSize: 12, fontWeight: '700', letterSpacing: 1,
    color: C.indigo,
  },
  netPayRowValue: {
    fontSize: 20, fontWeight: '800',
    color: C.textPrimary, letterSpacing: -0.5,
  },

  // History card
  historyCard: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderRadius: 18, borderWidth: 1,
    borderColor: C.border,
    marginBottom: 10, overflow: 'hidden',
    padding: 16, gap: 14,
  },
  historyAccent: { width: 3, borderRadius: 99, alignSelf: 'stretch' },
  historyTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 12,
  },
  historyMonth: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  historyDate:  { fontSize: 11, color: C.textMuted, marginTop: 2 },
  historyBottom: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  historyNetLabel: { fontSize: 11, color: C.textMuted },
  historyNetValue: { fontSize: 18, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.4 },

  // Status badge
  statusBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1,
  },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },

  // Skeleton
  skeletonWrap: { gap: 12 },
  skeleton: {
    height: 120, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: C.border,
  },
});