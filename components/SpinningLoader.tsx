import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SpinningLoaderProps {
  size?: number;
  color?: string;
  message?: string;
}

export default function SpinningLoader({
  size = 24,
  color = '#ED6D4E',
  message = 'Loading...'
}: SpinningLoaderProps) {
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spinAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spinAnimation.start();

    return () => spinAnimation.stop();
  }, []);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={{ transform: [{ rotate: spin }] }}>
        <Ionicons name="sync" size={size} color={color} />
      </Animated.View>
      {message && <Text style={[styles.message, { color }]}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  message: {
    fontSize: 16,
    fontWeight: '500',
  },
});
