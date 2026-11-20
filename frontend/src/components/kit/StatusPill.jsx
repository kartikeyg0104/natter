/**
 * StatusPill: whether a server answered, as a small tinted pill.
 */
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { type } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';

const LABELS = { idle: 'Not checked', checking: 'Checking', ok: 'Connected', fail: 'No answer' };

/** @param {{ state: 'idle' | 'checking' | 'ok' | 'fail' }} props */
export function StatusPill({ state }) {
  const { colors } = useTheme();
  const tint = state === 'ok' ? colors.success : state === 'fail' ? colors.danger : colors.textFaint;
  return (
    <View
      style={[styles.pill, { backgroundColor: colors.bgSunken }]}
      accessibilityLiveRegion="polite"
      accessibilityLabel={LABELS[state]}
    >
      {state === 'checking' ? (
        <ActivityIndicator size="small" color={colors.textFaint} style={styles.spinner} />
      ) : (
        <View style={[styles.dot, { backgroundColor: tint }]} />
      )}
      <Text style={[type.micro, { color: colors.textMuted }]}>{LABELS[state]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 24,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  spinner: { transform: [{ scale: 0.6 }], width: 10, height: 10 },
});
