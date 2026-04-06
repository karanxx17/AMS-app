import React, { useState } from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { colors } from './src/theme/colors';
import LoginScreen from './src/screens/LoginScreen';
import AppNavigator from './src/navigation/AppNavigator';

const Main = ({ onLogout }: { onLogout: () => void }) => (
  <NavigationContainer>
    <AppNavigator onLogout={onLogout} />
  </NavigationContainer>
);

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      {isLoggedIn
        ? <Main onLogout={() => setIsLoggedIn(false)} />
        : <LoginScreen onLogin={() => setIsLoggedIn(true)} />
      }
    </SafeAreaView>
  );
};

export default App;