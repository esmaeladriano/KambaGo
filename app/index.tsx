import { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { KAMBAGO_COLORS } from '../constants/theme';
import { getSupabaseClient } from '../services/supabase/client';
import { fetchMyProfile } from '../services/auth/authService';
import { useAuthStore } from '../store/useAuthStore';

export default function IndexScreen() {
  const setProfile = useAuthStore((state) => state.setProfile);
  const carPosition = useRef(new Animated.Value(-220)).current;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const animation = Animated.timing(carPosition, {
      toValue: 220,
      duration: 900,
      useNativeDriver: true,
    });
    animation.start();

    const timer = setTimeout(async () => {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          const profileResult = await fetchMyProfile();
          if (profileResult.ok && profileResult.data) {
            setProfile(profileResult.data);
            setReady(true);
            router.replace(profileResult.data.role === 'driver' ? '/(driver)' : '/(passenger)');
            return;
          }
        }
      }
      setReady(true);
      router.replace('/(auth)/welcome');
    }, 1100);

    return () => {
      clearTimeout(timer);
      animation.stop();
    };
  }, [carPosition, setProfile]);

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/kambago-logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.brand}>KambaGo</Text>
      {!ready && (
        <View style={styles.route}>
          <View style={styles.line} />
          <Animated.Image
            source={require('../assets/images/kambago-logo.png')}
            style={[
              styles.car,
              { transform: [{ translateX: carPosition }] },
            ]}
            resizeMode="contain"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  logo: {
    width: 150,
    height: 150,
  },
  brand: {
    color: KAMBAGO_COLORS.textPrimary,
    fontSize: 38,
    fontWeight: '800',
    marginTop: 8,
  },
  route: {
    width: 260,
    height: 40,
    marginTop: 24,
    justifyContent: 'center',
  },
  line: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: KAMBAGO_COLORS.border,
  },
  car: {
    width: 44,
    height: 44,
  },
});
