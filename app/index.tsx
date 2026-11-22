import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { KAMBAGO_COLORS } from '../constants/theme';
import { getSupabaseClient } from '../services/supabase/client';
import { fetchMyProfile } from '../services/auth/authService';
import { useAuthStore } from '../store/useAuthStore';

export default function IndexScreen() {
  const setProfile = useAuthStore((state) => state.setProfile);
  const carPosition = useRef(new Animated.Value(-80)).current;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const animation = Animated.timing(carPosition, {
      toValue: 260,
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
            router.replace('/profile');
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
      <Text style={styles.brand}>KambaGo</Text>
      {!ready && (
        <View style={styles.route}>
          <View style={styles.line} />
          <Animated.Text
            style={[styles.car, { transform: [{ translateX: carPosition }] }]}
          >
            {'\u25C0'}
          </Animated.Text>
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
    backgroundColor: KAMBAGO_COLORS.navy,
  },
  brand: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: '800',
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
    backgroundColor: KAMBAGO_COLORS.teal,
  },
  car: {
    color: KAMBAGO_COLORS.amber,
    fontSize: 24,
  },
});
