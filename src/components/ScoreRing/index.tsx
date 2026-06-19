import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { scoreColor, Colors } from '../../constants/colors';

// Animated.createAnimatedComponent works on both web and native
// unlike Moti's useAnimationState which conflicts with web React renderer
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ScoreRingProps {
  score: number;      // 0–100
  size?: number;
  strokeWidth?: number;
}

const DEFAULT_SIZE   = 120;
const DEFAULT_STROKE = 10;

export function ScoreRing({
  score,
  size        = DEFAULT_SIZE,
  strokeWidth = DEFAULT_STROKE,
}: ScoreRingProps) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const radius       = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const color        = scoreColor(clampedScore);

  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue:         clampedScore,
      duration:        900,
      useNativeDriver: false,
    }).start();
  }, [clampedScore]);

  // strokeDashoffset: full circumference (empty) → partial (filled)
  const strokeDashoffset = progress.interpolate({
    inputRange:  [0, 100],
    outputRange: [circumference, 0],
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg
        width={size}
        height={size}
        style={StyleSheet.absoluteFill as object}
      >
        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.ringTrack}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Animated progress arc */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>

      <View style={styles.label}>
        <Text style={[styles.number, { color }]}>{clampedScore}</Text>
        <Text style={styles.outOf}>/100</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems:     'center',
    justifyContent: 'center',
  },
  label: {
    alignItems: 'center',
  },
  number: {
    fontSize:   32,
    fontWeight: '700',
    lineHeight: 36,
  },
  outOf: {
    fontSize:   12,
    color:      Colors.textTertiary,
    fontWeight: '500',
  },
});
