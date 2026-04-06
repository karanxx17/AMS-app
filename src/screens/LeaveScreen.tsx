import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import Header from '../components/Header';

const tabs = ['Pending', 'Approved', 'Rejected'];

const LeaveScreen = ({ onLogout }: { onLogout: () => void }) => {
  const [activeTab, setActiveTab] = useState('Pending');

  return (
    <View style={styles.container}>
      <Header onLogout={onLogout} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Leave Management</Text>
        <View style={styles.tabRow}>
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}>
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No {activeTab.toLowerCase()} leave requests</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 16 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  tab: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: colors.cardBorder,
  },
  activeTab: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  activeTabText: { color: '#fff' },
  emptyCard: {
    backgroundColor: colors.card, borderRadius: 12,
    padding: 32, alignItems: 'center',
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  emptyText: { color: colors.textMuted, fontSize: 14 },
});

export default LeaveScreen;