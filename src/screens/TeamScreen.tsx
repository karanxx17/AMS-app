import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../theme/colors';
import Header from '../components/Header';

const employees = [
  { id: '1', name: 'John Doe', role: 'Developer', status: 'Present' },
  { id: '2', name: 'Jane Smith', role: 'Designer', status: 'Absent' },
  { id: '3', name: 'Mike Johnson', role: 'Manager', status: 'Late' },
];

const TeamScreen = ({ onLogout }: { onLogout: () => void }) => (
  <View style={styles.container}>
    <Header onLogout={onLogout} />
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>Team</Text>
      {employees.map(emp => (
        <View key={emp.id} style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{emp.name[0]}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>{emp.name}</Text>
            <Text style={styles.role}>{emp.role}</Text>
          </View>
          <View style={[styles.badge,
            { backgroundColor: emp.status === 'Present' ? colors.success : emp.status === 'Late' ? colors.warning : colors.danger }
          ]}>
            <Text style={styles.badgeText}>{emp.status}</Text>
          </View>
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
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: 12,
    padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  role: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});

export default TeamScreen;