/**
 * EmptyState: an icon tile, a short title, what to do next, and an
 * optional action. Used for empty lists and load errors.
 */
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { space, type } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { Button } from './Button';
import { Icon } from './Icon';

const TILE = 64;

/**
 * @param {object} props
 * @param {import('react').ComponentType<any>} props.icon
 * @param {string} props.title
 * @param {string} [props.message]
 * @param {string} [props.actionLabel]
 * @param {() => void} [props.onAction]
 */
export function EmptyState({ icon, title, message, actionLabel, onAction }) {
  const { colors } = useTheme();
  const float = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (reduceMotion) return;
    float.set(withRepeat(withSequence(withTiming(-6, { duration: 1400 }), withTiming(0, { duration: 1400 })), -1));
  }, [float, reduceMotion]);
  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: float.get() }, { rotate: `${float.get() * 0.6}deg` }] }));
  return (
    <Animated.View entering={FadeIn} style={styles.wrap}>
      <Animated.View style={[styles.tile, { backgroundColor: colors.accentSoft }, floatStyle]}>
        <Icon as={icon} color={colors.accent} size={30} />
      </Animated.View>
      <Text style={[type.heading, styles.center, { color: colors.text }]}>{title}</Text>
      {message ? (
        <Text style={[type.body, styles.center, { color: colors.textMuted }]}>{message}</Text>
      ) : null}
      {actionLabel ? (
        <View style={styles.action}>
          <Button label={actionLabel} variant="secondary" onPress={onAction} />
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space.xs, paddingVertical: space.xxxl, paddingHorizontal: space.xl },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  center: { textAlign: 'center' },
  action: { marginTop: space.md, alignSelf: 'stretch' },
});
