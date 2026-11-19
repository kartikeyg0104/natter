/**
 * FilterChip: one option in the Inbox filter row. Selected = solid ink.
 */
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { type } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { haptics } from '../../utils/haptics';

/** @param {{ label: string, isSelected: boolean, onPress: () => void }} props */
export function FilterChip({ label, isSelected, onPress }) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  useEffect(() => {
    if (isSelected) scale.set(withSequence(withTiming(0.9, { duration: 80 }), withSpring(1, { damping: 8, stiffness: 300 })));
  }, [isSelected, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return (
    <Animated.View style={style}>
    <Pressable
      onPress={() => {
        if (isSelected) return;
        haptics.tap();
        onPress();
      }}
      accessibilityRole="tab"
      accessibilityState={{ selected: isSelected }}
      style={[
        styles.chip,
        isSelected
          ? { backgroundColor: colors.text, borderColor: colors.text }
          : { backgroundColor: colors.card, borderColor: colors.line },
      ]}
    >
      <Text style={[type.chip, { color: isSelected ? colors.bg : colors.textMuted }]}>{label}</Text>
    </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  chip: { height: 36, paddingHorizontal: 16, borderRadius: 18, borderWidth: 1, justifyContent: 'center' },
});
