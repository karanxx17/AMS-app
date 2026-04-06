import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import { colors } from '../theme/colors';
import HomeScreen from '../screens/HomeScreen';
import LeaveScreen from '../screens/LeaveScreen';
import PayrollScreen from '../screens/PayrollScreen';
import TeamScreen from '../screens/TeamScreen';
import ReportScreen from '../screens/ReportScreen';
import BranchScreen from '../screens/BranchScreen';

const Tab = createBottomTabNavigator();

const getIcon = (label: string, color: string) => {
  const icons: Record<string, string> = {
    Home: '🏠', Leave: '📅', Payroll: '💰',
    Team: '👥', Report: '📊', Branch: '🏢',
  };
  return <Text style={{ fontSize: 18, color }}>{icons[label]}</Text>;
};

const AppNavigator = ({ onLogout }: { onLogout: () => void }) => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color }) => getIcon(route.name, color),
        tabBarStyle: {
          backgroundColor: colors.navBg,
          borderTopColor: colors.navBorder,
          height: 60,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, marginBottom: 4 },
      })}>
      <Tab.Screen name="Home">
        {() => <HomeScreen onLogout={onLogout} />}
      </Tab.Screen>
      <Tab.Screen name="Leave">
        {() => <LeaveScreen onLogout={onLogout} />}
      </Tab.Screen>
      <Tab.Screen name="Payroll">
        {() => <PayrollScreen onLogout={onLogout} />}
      </Tab.Screen>
      <Tab.Screen name="Team">
        {() => <TeamScreen onLogout={onLogout} />}
      </Tab.Screen>
      <Tab.Screen name="Report">
        {() => <ReportScreen onLogout={onLogout} />}
      </Tab.Screen>
      <Tab.Screen name="Branch">
        {() => <BranchScreen onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

export default AppNavigator;