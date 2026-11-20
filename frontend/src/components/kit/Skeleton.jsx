/**
 * Skeleton: a pulsing placeholder while data loads; still with reduce motion.
 * ListSkeleton: a few avatar + two-line rows.
 */
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { AVATAR_CORNER, space } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';

const PULSE_MS = 850;

export function Skeleton({ width = '100%', height, radius = 8 }) {
  const { colors } = useTheme();
  const opacity = useSharedValue(1);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!reduceMotion) opacity.set(withRepeat(withTiming(0.45, { duration: PULSE_MS }), -1, true));
  }, [opacity, reduceMotion]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.bgSunken }, style]}
      accessibilityLabel="Loading"
    />
  );
}

export function ListSkeleton({ rows = 6 }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} style={styles.row}>
          <Skeleton width={48} height={48} radius={Math.round(48 * AVATAR_CORNER)} />
          <View style={styles.lines}>
            <Skeleton width="45%" height={14} />
            <Skeleton width="80%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: space.md, paddingTop: space.sm, gap: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  lines: { flex: 1, gap: space.xs },
});
