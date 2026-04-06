import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../theme/colors';
import Header from '../components/Header';

const PayrollScreen = ({ onLogout }: { onLogout: () => void }) => (
  <View style={styles.container}>
    <Header onLogout={onLogout} />
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>Payroll</Text>
      <View style={styles.card}>
        <Text style={styles.month}>April 2026</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Basic Salary</Text>
          <Text style={styles.value}>₹0</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.label}>Deductions</Text>
          <Text style={[styles.value, { color: colors.danger }]}>- ₹0</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={[styles.label, { fontWeight: '700', color: colors.text }]}>Net Pay</Text>
          <Text style={[styles.value, { color: colors.success, fontWeight: '800' }]}>₹0</Text>
        </View>
      </View>
    </ScrollView>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 16 },
  card: {
    backgroundColor: colors.card, borderRadius: 12,
    padding: 20, borderWidth: 1, borderColor: colors.cardBorder,
  },
  month: { fontSize: 16, fontWeight: '700', color: colors.primary, marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  label: { fontSize: 14, color: colors.textSecondary },
  value: { fontSize: 14, color: colors.text, fontWeight: '600' },
  divider: { height: 1, backgroundColor: colors.cardBorder },
});

export default PayrollScreen;