import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '../components/Header';

const BASE_URL = 'https://attandance-management-payroll-1.onrender.com/api/v1';

const T = {
  bg:       '#0C0D10',
  surface:  '#111318',
  raised:   '#161A22',
  border:   'rgba(255,255,255,0.06)',
  gold:     '#C9A84C',
  goldDim:  'rgba(201,168,76,0.15)',
  text:     '#F0EDE8',
  muted:    'rgba(240,237,232,0.38)',
  dimmer:   'rgba(240,237,232,0.18)',
  green:    '#3DD68C',
  red:      '#F06A6A',
  amber:    '#F5A623',
  blue:     '#6E9EFF',
};

const fmtTime = (iso: string) =>
  iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });

const dayOfWeek = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { weekday: 'long' });

const STATUS_CONFIG: Record<string, { bg: string; border: string; color: string; label: string }> = {
  present:    { bg: 'rgba(61,214,140,0.1)',  border: 'rgba(61,214,140,0.25)',  color: T.green, label: 'Present'  },
  absent:     { bg: 'rgba(240,106,106,0.1)', border: 'rgba(240,106,106,0.25)', color: T.red,   label: 'Absent'   },
  late:       { bg: 'rgba(245,166,35,0.1)',  border: 'rgba(245,166,35,0.25)',  color: T.amber, label: 'Late'     },
  'half-day': { bg: 'rgba(110,158,255,0.1)', border: 'rgba(110,158,255,0.25)', color: T.blue,  label: 'Half Day' },
};

const FILTER_TABS = ['All', 'Present', 'Absent', 'Late'];

const StatusBadge = ({ status }: { status: string }) => {
  const s = STATUS_CONFIG[status] ?? STATUS_CONFIG.absent;
  return (
    <View style={[badgeStyles.badge, { backgroundColor: s.bg, borderColor: s.border }]}>
      <View style={[badgeStyles.dot, { backgroundColor: s.color }]} />
      <Text style={[badgeStyles.text, { color: s.color }]}>{s.label}</Text>
    </View>
  );
};

const badgeStyles = StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 99, borderWidth: 1,
  },
  dot: { width: 4, height: 4, borderRadius: 99 },
  text: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
});

const AttendanceScreen = ({ onLogout }: { onLogout: () => void }) => {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${BASE_URL}/attendance?date=${selectedDate}&limit=200`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setRecords(data?.data?.records ?? data?.data ?? []);
    } catch (e) {
      console.log('Error', e);
    } finally {
      setLoading(false);
    }
  };

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const filtered = activeFilter === 'All'
    ? records
    : records.filter((r: any) => r.status === activeFilter.toLowerCase());

  const stats = {
    total:   records.length,
    present: records.filter((r: any) => r.status === 'present').length,
    absent:  records.filter((r: any) => r.status === 'absent').length,
    late:    records.filter((r: any) => r.status === 'late').length,
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  return (
    <View style={styles.container}>
      <Header onLogout={onLogout} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <Text style={styles.title}>Attendance</Text>
        <Text style={styles.subtitle}>Daily attendance records & tracking</Text>

        {/* Date Navigator */}
        <View style={styles.dateCard}>
          <View style={styles.dateRow}>
            <TouchableOpacity style={styles.arrowBtn} onPress={() => changeDate(-1)}>
              <Text style={styles.arrowText}>←</Text>
            </TouchableOpacity>
            <View style={styles.dateCenter}>
              <Text style={styles.dateValue}>
                {new Date(selectedDate).toLocaleDateString('en-IN', {
                  weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
                })}
              </Text>
              {isToday && (
                <View style={styles.todayPill}>
                  <View style={styles.todayDot} />
                  <Text style={styles.todayText}>Today</Text>
                </View>
              )}
            </View>
            <TouchableOpacity style={styles.arrowBtn} onPress={() => changeDate(1)}>
              <Text style={styles.arrowText}>→</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stat Pills */}
        <View style={styles.statsRow}>
          {[
            { label: 'Total',   value: stats.total,   color: T.blue  },
            { label: 'Present', value: stats.present, color: T.green },
            { label: 'Absent',  value: stats.absent,  color: T.red   },
            { label: 'Late',    value: stats.late,     color: T.amber },
          ].map((s) => (
            <View key={s.label} style={styles.statPill}>
              <Text style={styles.statLabel}>{s.label}</Text>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            </View>
          ))}
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterRow}>
          {FILTER_TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.filterTab, activeFilter === tab && styles.filterTabActive]}
              onPress={() => setActiveFilter(tab)}>
              <Text style={[styles.filterText, activeFilter === tab && styles.filterTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Records */}
        {loading ? (
          <ActivityIndicator color={T.gold} size="large" style={{ marginTop: 48 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No records found for this filter</Text>
          </View>
        ) : (
          <View style={styles.tableCard}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { flex: 1.5 }]}>Date</Text>
              <Text style={[styles.th, { flex: 1 }]}>In</Text>
              <Text style={[styles.th, { flex: 1 }]}>Out</Text>
              <Text style={[styles.th, { flex: 0.7 }]}>Hrs</Text>
              <Text style={[styles.th, { flex: 1.3 }]}>Status</Text>
            </View>

            {/* Table Rows */}
            {filtered.map((r: any, idx: number) => {
              const isRowToday = new Date(r.date).toDateString() === new Date().toDateString();
              return (
                <View
                  key={r._id ?? idx}
                  style={[
                    styles.tableRow,
                    idx < filtered.length - 1 && styles.tableRowBorder,
                    isRowToday && styles.tableRowToday,
                  ]}>
                  <View style={[styles.td, { flex: 1.5 }]}>
                    {isRowToday && <View style={styles.rowDot} />}
                    <View>
                      <Text style={[styles.dateCell, isRowToday && { color: T.gold }]}>
                        {fmtDate(r.date)}
                      </Text>
                      <Text style={styles.dayCell}>{dayOfWeek(r.date)}</Text>
                    </View>
                  </View>
                  <View style={[styles.td, { flex: 1 }]}>
                    <Text style={[styles.timeCell, { color: r.checkIn?.time ? T.green : T.dimmer }]}>
                      {fmtTime(r.checkIn?.time)}
                    </Text>
                  </View>
                  <View style={[styles.td, { flex: 1 }]}>
                    <Text style={[styles.timeCell, { color: r.checkOut?.time ? T.red : T.dimmer }]}>
                      {fmtTime(r.checkOut?.time)}
                    </Text>
                  </View>
                  <View style={[styles.td, { flex: 0.7 }]}>
                    {r.workingHours ? (
                      <Text style={[styles.hoursCell, {
                        color: r.workingHours >= 8 ? T.green : r.workingHours >= 4 ? T.amber : T.red,
                      }]}>
                        {r.workingHours.toFixed(1)}h
                      </Text>
                    ) : (
                      <Text style={styles.dimText}>—</Text>
                    )}
                  </View>
                  <View style={[styles.td, { flex: 1.3, flexDirection: 'column', alignItems: 'flex-start', gap: 3 }]}>
                    <StatusBadge status={r.status} />
                    {r.isLate && r.lateByMinutes && (
                      <View style={styles.latePill}>
                        <Text style={styles.lateText}>+{r.lateByMinutes}m</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}

            {/* Footer */}
            <View style={styles.tableFooter}>
              <Text style={styles.footerText}>{filtered.length} of {records.length} records</Text>
              {filtered.length > 0 && (
                <Text style={styles.footerText}>
                  Avg:{' '}
                  <Text style={{ color: T.gold, fontWeight: '700' }}>
                    {(
                      filtered.reduce((s: number, r: any) => s + (r.workingHours ?? 0), 0) /
                      (filtered.filter((r: any) => r.workingHours > 0).length || 1)
                    ).toFixed(2)}h
                  </Text>
                </Text>
              )}
            </View>
          </View>
        )}

        <View style={styles.footerRule}>
          <Text style={styles.footerRuleText}>
            Location & biometric data is encrypted and stored securely
          </Text>
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  scroll: { padding: 16, paddingBottom: 100 },
  title: { fontSize: 24, fontWeight: '800', color: T.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: T.muted, marginBottom: 20 },
  dateCard: {
    backgroundColor: T.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: T.border, marginBottom: 16,
  },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrowBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: T.border,
    alignItems: 'center', justifyContent: 'center',
  },
  arrowText: { color: T.muted, fontSize: 16, fontWeight: '600' },
  dateCenter: { flex: 1, alignItems: 'center', gap: 6 },
  dateValue: { fontSize: 13, fontWeight: '600', color: T.text, textAlign: 'center' },
  todayPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 3,
    backgroundColor: T.goldDim, borderRadius: 99,
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.3)',
  },
  todayDot: { width: 5, height: 5, borderRadius: 99, backgroundColor: T.gold },
  todayText: { fontSize: 10, color: T.gold, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statPill: {
    flex: 1, backgroundColor: T.surface, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: T.border,
  },
  statLabel: { fontSize: 9, color: T.muted, letterSpacing: 0.8, marginBottom: 6, textTransform: 'uppercase' },
  statValue: { fontSize: 22, fontWeight: '800' },
  filterRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  filterTab: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    backgroundColor: T.surface, alignItems: 'center',
    borderWidth: 1, borderColor: T.border,
  },
  filterTabActive: { backgroundColor: T.goldDim, borderColor: 'rgba(201,168,76,0.4)' },
  filterText: { fontSize: 12, color: T.muted, fontWeight: '600' },
  filterTextActive: { color: T.gold },
  emptyCard: {
    backgroundColor: T.surface, borderRadius: 16, padding: 48,
    alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: T.border,
  },
  emptyIcon: { fontSize: 28, opacity: 0.3 },
  emptyText: { fontSize: 14, color: T.dimmer, fontStyle: 'italic' },
  tableCard: {
    backgroundColor: T.surface, borderRadius: 16,
    borderWidth: 1, borderColor: T.border,
    overflow: 'hidden', marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.015)',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: T.border,
  },
  th: { fontSize: 9, color: T.dimmer, letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: '600' },
  tableRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 12, alignItems: 'center' },
  tableRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  tableRowToday: { backgroundColor: 'rgba(201,168,76,0.025)' },
  td: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowDot: { width: 5, height: 5, borderRadius: 99, backgroundColor: T.gold, marginRight: 4 },
  dateCell: { fontSize: 11, color: T.text, fontWeight: '500' },
  dayCell: { fontSize: 10, color: T.dimmer, fontStyle: 'italic', marginTop: 2 },
  timeCell: { fontSize: 12, fontWeight: '500' },
  hoursCell: { fontSize: 14, fontWeight: '700' },
  dimText: { fontSize: 12, color: T.dimmer },
  latePill: {
    paddingHorizontal: 6, paddingVertical: 1,
    backgroundColor: 'rgba(245,166,35,0.08)',
    borderRadius: 6, borderWidth: 1,
    borderColor: 'rgba(245,166,35,0.2)',
  },
  lateText: { fontSize: 9, color: T.amber, fontWeight: '600' },
  tableFooter: {
    flexDirection: 'row', justifyContent: 'space-between',
    padding: 12, borderTopWidth: 1, borderTopColor: T.border,
  },
  footerText: { fontSize: 10, color: T.dimmer },
  footerRule: { alignItems: 'center', marginTop: 20, marginBottom: 20 },
  footerRuleText: { fontSize: 10, color: T.dimmer, fontStyle: 'italic', textAlign: 'center' },
});

export default AttendanceScreen;