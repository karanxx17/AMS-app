import React, { useState, useRef } from 'react';
import {
  SafeAreaView,
  PermissionsAndroid,
  Platform,
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ opacity }: { opacity: Animated.Value }) => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  
React.useEffect(() => {
    // Pulsing ring
    Animated.loop(
      Animated.sequence([
        Animated.timing(ring, { toValue: 1, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(ring, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();

    // Staggered dots — call start() separately, not inside Animated.parallel
    const animateDot = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 400, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
          Animated.delay(800 - delay),
        ])
      );

    animateDot(dot1, 0).start();
    animateDot(dot2, 200).start();
    animateDot(dot3, 400).start();
  }, []);
  const ringScale = ring.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.4] });
  const ringOpacity = ring.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 0.3, 0] });

  const dotStyle = (anim: Animated.Value) => ({
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }],
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
  });

  return (
    <Animated.View style={[styles.splash, { opacity }]}>
      {/* Background blobs */}
      <View style={[styles.blob, styles.blob1]} />
      <View style={[styles.blob, styles.blob2]} />

      {/* Icon area */}
      <View style={styles.iconWrap}>
        <Animated.View
          style={[
            styles.ring,
            { transform: [{ scale: ringScale }], opacity: ringOpacity },
          ]}
        />
        <View style={styles.iconCircle}>
          {/* Location pin SVG-like shape using Views */}
          <View style={styles.pinHead} />
          <View style={styles.pinTip} />
        </View>
      </View>

      {/* Text */}
      <Text style={styles.title}>Locating You</Text>
      <Text style={styles.subtitle}>Setting up your experience</Text>

      {/* Dots */}
      <View style={styles.dotsRow}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View key={i} style={[styles.dot, dotStyle(dot)]} />
        ))}
      </View>
    </Animated.View>
  );
};

const App = () => {
  const [webViewReady, setWebViewReady] = useState(false);
  const splashOpacity = useRef(new Animated.Value(1)).current;

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ]);
    }
  };

  React.useEffect(() => {
    requestPermissions();
  }, []);

  const handleWebViewLoad = () => {
    Animated.timing(splashOpacity, {
      toValue: 0,
      duration: 600,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => setWebViewReady(true));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0b0f1a' }}>
      <WebView
        source={{ uri: 'https://benevolent-alfajores-cf7e39.netlify.app' }}
        allowsFullscreenVideo
        javaScriptEnabled
        domStorageEnabled
        geolocationEnabled
        mediaCapturePermissionGrantType="grant"
        originWhitelist={['*']}
        onLoad={handleWebViewLoad}
        style={{ opacity: webViewReady ? 1 : 0 }}
      />
      {!webViewReady && <SplashScreen opacity={splashOpacity} />}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  splash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0b0f1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.15,
  },
  blob1: {
    width: 320,
    height: 320,
    backgroundColor: '#3b82f6',
    top: height * 0.1,
    left: -60,
  },
  blob2: {
    width: 260,
    height: 260,
    backgroundColor: '#6366f1',
    bottom: height * 0.15,
    right: -40,
  },
  iconWrap: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  ring: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1e293b',
    borderWidth: 1.5,
    borderColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinHead: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#3b82f6',
    marginBottom: -4,
  },
  pinTip: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#3b82f6',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f1f5f9',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    letterSpacing: 0.3,
    marginBottom: 40,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
  },
});

export default App;