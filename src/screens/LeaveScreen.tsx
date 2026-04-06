import React, { useState, useRef, useEffect } from 'react';
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
  labelMuted:  'rgba(255,255,255,0.38)',
  indigo:      '#818cf8',
  blue:   { bg: 'rgba(99,102,241,0.12)',  text: '#818cf8', border: 'rgba(99,102,241,0.25)' },
  green:  { bg: 'rgba(34,197,94,0.12)',   text: '#4ade80', border: 'rgba(34,197,94,0.25)' },
  red:    { bg: 'rgba(239,68,68,0.12)',   text: '#f87171', border: 'rgba(239,68,68,0.25)' },
  amber:  { bg: 'rgba(245,158,11,0.12)',  text: '#fbbf24', border: 'rgba(245,158,11,0.25)' },
};

const { width: SW } = Dimensions.get('window');

// ─── TYPES ────────────────────────────────────────────────────────────
interface LeaveRequest {
  _id: string;
  employee?: { name: string; department: string };
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedOn?: string;
  days?: number;
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

const apiPost = async (path: string, body: any) => {
  const token = await AsyncStorage.getItem('token');
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
};

// ─── HELPERS ──────────────────────────────────────────────────────────
const fmtDate = (iso: string) =>
  iso
    ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

const daysBetween = (start: string, end: string) => {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.round(ms / 86400000) + 1);
};

const LEAVE_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  sick:      C.red,
  casual:    C.blue,
  earned:    C.green,
  maternity: { bg: 'rgba(168,85,247,0.12)', text: '#c084fc', border: 'rgba(168,85,247,0.25)' },
  paternity: { bg: 'rgba(168,85,247,0.12)', text: '#c084fc', border: 'rgba(168,85,247,0.25)' },
  unpaid:    C.amber,
  default:   C.blue,
};

const getLeaveColor = (type: string) =>
  LEAVE_TYPE_COLORS[type?.toLowerCase()] ?? LEAVE_TYPE_COLORS.default;

// ─── TAB CONFIG ───────────────────────────────────────────────────────
const TABS = [
  { key: 'pending',  label: 'Pending',  icon: '◐', accent: 'amber' as const },
  { key: 'approved', label: 'Approved', icon: '✓', accent: 'green' as const },
  { key: 'rejected', label: 'Rejected', icon: '✕', accent: 'red'   as const },
];

// ─── SECTION HEADING ─────────────────────────────────────────────────
function SectionHeading({ children }: { children: React.ReactNode }) {
  return <Text style={s.sectionHeading}>{children}</Text>;
}

// ─── STAT PILL ───────────────────────────────────────────────────────
function StatPill({
  label, value, accent, delay = 0,
}: {
  label: string; value: number;
  accent: 'blue' | 'green' | 'red' | 'amber'; delay?: number;
}) {
  // ✅ ALL hooks at the very top unconditionally
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 450, delay, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 450, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const c = C[accent];
  return (
    <Animated.View
      style={[
        s.statPill,
        { opacity: fade, transform: [{ translateY: slide }],
          backgroundColor: c.bg, borderColor: c.border },
      ]}
    >
      <Text style={[s.statValue, { color: c.text }]}>{value}</Text>
      <Text style={[s.statLabel, { color: c.text + 'aa' }]}>{label}</Text>
    </Animated.View>
  );
}

// ─── LEAVE TYPE BADGE ────────────────────────────────────────────────
function LeaveBadge({ type }: { type: string }) {
  const c = getLeaveColor(type);
  return (
    <View style={[s.badge, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={[s.badgeText, { color: c.text }]}>
        {type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Leave'}
      </Text>
    </View>
  );
}

// ─── STATUS BADGE ────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { c: typeof C.green; icon: string }> = {
    approved: { c: C.green, icon: '✓' },
    rejected: { c: C.red,   icon: '✕' },
    pending:  { c: C.amber, icon: '◐' },
  };
  const conf = map[status] ?? map.pending;
  return (
    <View style={[s.badge, { backgroundColor: conf.c.bg, borderColor: conf.c.border }]}>
      <Text style={[s.badgeText, { color: conf.c.text }]}>
        {conf.icon} {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Pending'}
      </Text>
    </View>
  );
}

// ─── LEAVE CARD ───────────────────────────────────────────────────────
function LeaveCard({
  item, index, isAdmin, onApprove, onReject,
}: {
  item: LeaveRequest; index: number; isAdmin: boolean;
  onApprove?: (id: string) => void; onReject?: (id: string) => void;
}) {
  // ✅ ALL hooks unconditionally at the very top
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const delay = index * 60;
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 400, delay, useNativeDriver: true }),
    ]).start();
  }, [index]);

  const days = item.days ?? daysBetween(item.startDate, item.endDate);
  const lc   = getLeaveColor(item.leaveType);

  return (
    <Animated.View
      style={[s.leaveCard, { opacity: fade, transform: [{ translateY: slide }] }]}
    >
      {/* Left accent bar */}
      <View style={[s.accentBar, { backgroundColor: lc.text }]} />

      <View style={{ flex: 1 }}>
        {/* Top row */}
        <View style={s.cardTopRow}>
          <View style={s.avatarWrap}>
            <View style={[s.avatar, { backgroundColor: lc.bg, borderColor: lc.border }]}>
              <Text style={[s.avatarText, { color: lc.text }]}>
                {item.employee?.name?.charAt(0)?.toUpperCase() ?? '?'}
              </Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.empName} numberOfLines={1}>
                {item.employee?.name ?? 'Employee'}
              </Text>
              <Text style={s.empDept} numberOfLines={1}>
                {item.employee?.department ?? '—'}
              </Text>
            </View>
          </View>
          <StatusBadge status={item.status} />
        </View>

        {/* Divider */}
        <View style={s.divider} />

        {/* Meta row */}
        <View style={s.metaRow}>
          <LeaveBadge type={item.leaveType} />
          <View style={s.daysPill}>
            <Text style={s.daysNum}>{days}</Text>
            <Text style={s.daysLabel}>{days === 1 ? 'day' : 'days'}</Text>
          </View>
        </View>

        {/* Date range */}
        <View style={s.dateRow}>
          <View style={s.dateBlock}>
            <Text style={s.dateCaption}>FROM</Text>
            <Text style={s.dateValue}>{fmtDate(item.startDate)}</Text>
          </View>
          <View style={s.dateSep}>
            <View style={s.dateLine2} />
            <Text style={s.dateArrow}>→</Text>
            <View style={s.dateLine2} />
          </View>
          <View style={[s.dateBlock, { alignItems: 'flex-end' }]}>
            <Text style={s.dateCaption}>TO</Text>
            <Text style={s.dateValue}>{fmtDate(item.endDate)}</Text>
          </View>
        </View>

        {/* Reason */}
        {!!item.reason && (
          <Text style={s.reason} numberOfLines={2}>
            "{item.reason}"
          </Text>
        )}

        {/* Admin actions — only for pending */}
        {isAdmin && item.status === 'pending' && (
          <View style={s.actionRow}>
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: C.green.bg, borderColor: C.green.border }]}
              onPress={() => onApprove?.(item._id)}
              activeOpacity={0.75}
            >
              <Text style={[s.actionBtnText, { color: C.green.text }]}>✓  Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: C.red.bg, borderColor: C.red.border }]}
              onPress={() => onReject?.(item._id)}
              activeOpacity={0.75}
            >
              <Text style={[s.actionBtnText, { color: C.red.text }]}>✕  Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────
function EmptyState({ status }: { status: string }) {
  const icons: Record<string, string> = {
    pending: '◐', approved: '✓', rejected: '✕',
  };
  return (
    <View style={s.emptyWrap}>
      <View style={s.emptyIconWrap}>
        <Text style={s.emptyIcon}>{icons[status] ?? '—'}</Text>
      </View>
      <Text style={s.emptyTitle}>No {status} requests</Text>
      <Text style={s.emptySubtitle}>
        Leave requests marked as {status} will appear here.
      </Text>
    </View>
  );
}

// ─── MAIN SCREEN ─────────────────────────────────────────────────────
interface Props {
  onLogout?: () => void;
  isAdmin?: boolean;
  isHR?: boolean;
}

export default function LeaveScreen({ onLogout, isAdmin = false, isHR = false }: Props) {
  // ✅ ALL hooks together at the very top — no conditions before any of them
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [leaves, setLeaves]       = useState<LeaveRequest[]>([]);
  const [loading, setLoading]     = useState(true);
  const indicatorAnim             = useRef(new Animated.Value(0)).current;

  const tabW = (SW - 40) / 3;

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await apiGet('/leaves?limit=100');
      setLeaves(res?.data?.leaves ?? res?.data ?? []);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeaves(); }, []);

  const handleTabChange = (idx: number, key: typeof activeTab) => {
    setActiveTab(key);
    Animated.spring(indicatorAnim, {
      toValue: idx * tabW,
      useNativeDriver: true,
      tension: 300,
      friction: 30,
    }).start();
  };

  const handleApprove = async (id: string) => {
    await apiPost(`/leaves/${id}/approve`, {});
    fetchLeaves();
  };

  const handleReject = async (id: string) => {
    await apiPost(`/leaves/${id}/reject`, {});
    fetchLeaves();
  };

  const filtered = leaves.filter(l => l.status === activeTab);

  const counts = {
    pending:  leaves.filter(l => l.status === 'pending').length,
    approved: leaves.filter(l => l.status === 'approved').length,
    rejected: leaves.filter(l => l.status === 'rejected').length,
  };

  const activeTabLabel = activeTab.charAt(0).toUpperCase() + activeTab.slice(1);

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* ── HEADER ── */}
      <View style={s.header}>
        <Text style={s.headerEyebrow}>HR MODULE</Text>
        <Text style={s.headerTitle}>Leave Management</Text>
        <Text style={s.headerSub}>Review and manage employee leave requests.</Text>
      </View>

      {/* ── STAT PILLS ── */}
      <View style={s.statsRow}>
        <StatPill label="Pending"  value={counts.pending}  accent="amber" delay={0}   />
        <StatPill label="Approved" value={counts.approved} accent="green" delay={70}  />
        <StatPill label="Rejected" value={counts.rejected} accent="red"   delay={140} />
      </View>

      {/* ── TAB BAR ── */}
      <View style={s.section}>
        <View style={s.tabBar}>
          <Animated.View
            style={[
              s.tabIndicator,
              { width: tabW - 8, transform: [{ translateX: indicatorAnim }] },
              activeTab === 'pending'  && { backgroundColor: C.amber.bg, borderColor: C.amber.border },
              activeTab === 'approved' && { backgroundColor: C.green.bg,  borderColor: C.green.border },
              activeTab === 'rejected' && { backgroundColor: C.red.bg,    borderColor: C.red.border   },
            ]}
          />
          {TABS.map((tab, idx) => {
            const isActive = activeTab === tab.key;
            const ac = C[tab.accent];
            return (
              <TouchableOpacity
                key={tab.key}
                style={s.tab}
                onPress={() => handleTabChange(idx, tab.key as typeof activeTab)}
                activeOpacity={0.75}
              >
                <Text style={[s.tabIcon,  isActive && { color: ac.text }]}>{tab.icon}</Text>
                <Text style={[s.tabLabel, isActive && { color: ac.text, fontWeight: '700' }]}>
                  {tab.label}
                </Text>
                {(counts as any)[tab.key] > 0 && (
                  <View style={[
                    s.tabBadge,
                    isActive && { backgroundColor: ac.bg, borderColor: ac.border },
                  ]}>
                    <Text style={[s.tabBadgeText, isActive && { color: ac.text }]}>
                      {(counts as any)[tab.key]}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── LIST ── */}
      <View style={s.section}>
        <SectionHeading>{`${activeTabLabel} requests`}</SectionHeading>

        {loading ? (
          <View style={s.loadingWrap}>
            {[0, 1, 2].map(i => (
              <View key={i} style={[s.skeletonCard, { opacity: 1 - i * 0.25 }]} />
            ))}
          </View>
        ) : filtered.length === 0 ? (
          <EmptyState status={activeTab} />
        ) : (
          filtered.map((item, idx) => (
            <LeaveCard
              key={item._id}
              item={item}
              index={idx}
              isAdmin={isAdmin || isHR}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.bg },
  scroll:  { padding: 20, paddingBottom: 100 },

  // Header
  header:        { marginBottom: 24 },
  headerEyebrow: {
    fontSize: 10, fontWeight: '700', letterSpacing: 1.5,
    textTransform: 'uppercase', color: C.indigo, marginBottom: 6,
  },
  headerTitle: {
    fontSize: 28, fontWeight: '800', color: C.textPrimary,
    letterSpacing: -0.6, marginBottom: 6,
  },
  headerSub: { fontSize: 13, color: C.textMuted },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statPill: {
    flex: 1, alignItems: 'center', paddingVertical: 14,
    borderRadius: 16, borderWidth: 1,
  },
  statValue: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5, marginTop: 2 },

  // Section
  section: { marginBottom: 24 },
  sectionHeading: {
    fontSize: 10, fontWeight: '700', letterSpacing: 1.2,
    textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)',
    marginBottom: 12,
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  tabIndicator: {
    position: 'absolute',
    top: 4, left: 4,
    height: '100%',
    borderRadius: 14,
    borderWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 11,
    zIndex: 1,
  },
  tabIcon:      { fontSize: 12, color: C.textMuted },
  tabLabel:     { fontSize: 12, fontWeight: '500', color: C.textMuted },
  tabBadge: {
    paddingHorizontal: 6, paddingVertical: 1,
    borderRadius: 99, borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'transparent',
  },
  tabBadgeText: { fontSize: 10, fontWeight: '700', color: C.textGhost },

  // Leave card
  leaveCard: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 12,
    overflow: 'hidden',
    padding: 16,
    gap: 14,
  },
  accentBar: { width: 3, borderRadius: 99, alignSelf: 'stretch', marginRight: 2 },
  cardTopRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12, gap: 8,
  },
  avatarWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  avatar: {
    width: 36, height: 36, borderRadius: 11,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '700' },
  empName:    { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  empDept:    { fontSize: 11, color: C.textMuted, marginTop: 1 },
  divider:    { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: 12 },
  metaRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 14,
  },

  // Badge
  badge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },

  // Days pill
  daysPill: {
    flexDirection: 'row', alignItems: 'baseline', gap: 3,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  daysNum:   { fontSize: 16, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.3 },
  daysLabel: { fontSize: 10, color: C.textMuted, fontWeight: '600' },

  // Date range
  dateRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  dateBlock:   { flex: 1 },
  dateCaption: {
    fontSize: 9, fontWeight: '700', letterSpacing: 1.2,
    color: C.textGhost, marginBottom: 3, textTransform: 'uppercase',
  },
  dateValue: { fontSize: 13, fontWeight: '600', color: C.textPrimary },
  dateSep:   { flex: 0.6, flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateLine2: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  dateArrow: { fontSize: 12, color: C.textGhost },

  // Reason
  reason: {
    fontSize: 12, color: C.textMuted,
    fontStyle: 'italic', lineHeight: 18, marginBottom: 4,
  },

  // Action buttons
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1, alignItems: 'center',
  },
  actionBtnText: { fontSize: 13, fontWeight: '700' },

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
  emptyIcon:     { fontSize: 22, color: C.textGhost },
  emptyTitle:    { fontSize: 15, fontWeight: '700', color: C.textPrimary },
  emptySubtitle: { fontSize: 12, color: C.textMuted, textAlign: 'center', lineHeight: 18 },

  // Skeletons
  loadingWrap:  { gap: 12 },
  skeletonCard: {
    height: 160, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: C.border,
  },
});