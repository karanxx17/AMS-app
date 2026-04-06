import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../theme/colors';
import Header from '../components/Header';

const ReportScreen = ({ onLogout }: { onLogout: () => void }) => (
  <View style={styles.container}>
    <Header onLogout={onLogout} />
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>Reports</Text>
      {['Attendance Report', 'Payroll Report', 'Leave Report'].map(r => (
        <View key={r} style={styles.card}>
          <Text style={styles.reportName}>{r}</Text>
          <Text style={styles.reportSub}>April 2026</Text>
        </View>
      ))}
    </ScrollView>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 16 },
  card: {
    backgroundColor: colors.card, borderRadius: 12,
    padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: colors.cardBorder,
    borderLeftWidth: 4, borderLeftColor: colors.primary,
  },
  reportName: { fontSize: 15, fontWeight: '600', color: colors.text },
  reportSub: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
});

export default ReportScreen;