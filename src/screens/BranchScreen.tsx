import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../theme/colors';
import Header from '../components/Header';

const branches = [
  { id: '1', name: 'Head Office', location: 'Mumbai', employees: 8 },
  { id: '2', name: 'Branch 2', location: 'Delhi', employees: 6 },
];

const BranchScreen = ({ onLogout }: { onLogout: () => void }) => (
  <View style={styles.container}>
    <Header onLogout={onLogout} />
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>Branches</Text>
      {branches.map(b => (
        <View key={b.id} style={styles.card}>
          <Text style={styles.name}>{b.name}</Text>
          <Text style={styles.location}>📍 {b.location}</Text>
          <Text style={styles.count}>{b.employees} Employees</Text>
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
  },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  location: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  count: { fontSize: 12, color: colors.primary, marginTop: 6, fontWeight: '600' },
});

export default BranchScreen;