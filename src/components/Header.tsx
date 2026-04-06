import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';

interface Props {
  onLogout?: () => void;
}

const Header: React.FC<Props> = ({ onLogout }) => (
  <View style={styles.header}>
    <Text style={styles.logo}>AttendPay</Text>
    <View style={styles.right}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>A</Text>
      </View>
      {onLogout && (
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  logo: { fontSize: 18, fontWeight: '700', color: colors.text },
  right: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  logoutBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: colors.danger,
  },
  logoutText: { color: colors.danger, fontSize: 12, fontWeight: '600' },
});

export default Header;