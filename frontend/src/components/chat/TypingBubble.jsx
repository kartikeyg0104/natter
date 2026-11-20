/**
 * TypingBubble: three dots bouncing in a bubble at the bottom of the
 * thread while someone is typing, with their picture beside it.
 */
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { radius, shadow, space, type } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { Avatar } from '../avatar/Avatar';

function Dot({ delay, color }) {
  const y = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (reduceMotion) return;
    y.set(
      withDelay(
        delay,
        withRepeat(withSequence(withTiming(-5, { duration: 260 }), withTiming(0, { duration: 260 }), withTiming(0, { duration: 300 })), -1),
      ),
    );
  }, [y, delay, reduceMotion]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }], opacity: 0.55 + y.get() * -0.08 }));
  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
}

/** @param {{ name: string, label?: string }} props */
export function TypingBubble({ name, label }) {
  const { colors } = useTheme();
  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={styles.row} accessibilityLabel={`${name} is typing`}>
      <Avatar name={name} size={28} />
      <View style={[styles.bubble, { backgroundColor: colors.incoming }, shadow(1, colors.shadow)]}>
        <Dot delay={0} color={colors.textMuted} />
        <Dot delay={140} color={colors.textMuted} />
        <Dot delay={280} color={colors.textMuted} />
      </View>
      {label ? <Text style={[type.caption, { color: colors.textFaint }]}>{label}</Text> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.md, paddingVertical: space.xs },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: radius.bubble,
    borderBottomLeftRadius: radius.bubbleTight,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
