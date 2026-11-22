/**
 * StatusRing: an avatar inside a ring. A slowly spinning brand-gradient ring
 * when there are updates you haven't seen, a grey ring when you've seen
 * them all, none when there are none.
 */
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { Avatar } from '../avatar/Avatar';
import { Gradient } from '../kit/Gradient';

/**
 * @param {{ name: string, size?: number, state: 'unseen' | 'seen' | 'none', photoId?: string | null }} props
 */
export function StatusRing({ name, size = 52, state, photoId }) {
  const { colors } = useTheme();
  const spin = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  const ring = 3;
  const gap = 2.5;
  const outer = size + (ring + gap) * 2;

  useEffect(() => {
    if (state !== 'unseen' || reduceMotion) return;
    spin.set(withRepeat(withTiming(360, { duration: 4000, easing: Easing.linear }), -1, false));
  }, [state, spin, reduceMotion]);

  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.get()}deg` }] }));
  const box = { width: outer, height: outer, borderRadius: outer / 2 };

  return (
    <View
      style={[
        styles.center,
        box,
        state === 'seen' ? { borderWidth: ring, borderColor: colors.line } : null,
      ]}
    >
      {state === 'unseen' ? (
        <Animated.View style={[StyleSheet.absoluteFill, spinStyle]}>
          <Gradient kind="ring" style={[StyleSheet.absoluteFill, { borderRadius: outer / 2 }]} />
        </Animated.View>
      ) : null}
      <View
        style={
          state === 'unseen'
            ? [styles.center, { padding: gap, borderRadius: (size + gap * 2) / 2, backgroundColor: colors.bg }]
            : null
        }
      >
        <Avatar name={name} size={size} photoId={photoId} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({ center: { alignItems: 'center', justifyContent: 'center' } });
