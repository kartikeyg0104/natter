/**
 * Segmented: a row of mutually exclusive options. The chosen one sits on a
 * raised card that slides between segments.
 */
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { durations, EASE_IN_OUT } from '../../constants/motion';
import { radius, shadow, type } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { haptics } from '../../utils/haptics';
import { segmentWidth, selectedIndex } from '../../utils/segments';

const TIMING = { duration: durations.indicator, easing: EASE_IN_OUT };
const HEIGHT = 42;
const PAD = 3;

/**
 * @param {object} props
 * @param {{ value: string, label: string }[]} props.options
 * @param {string} props.value
 * @param {(value: string) => void} props.onChange
 * @param {'light' | 'panel'} [props.tone='light']
 */
export function Segmented({ options, value, onChange, tone = 'light' }) {
  const { colors } = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);
  const offset = useSharedValue(0);
  const width = segmentWidth(trackWidth, options.length);
  const index = selectedIndex(options, value);
  const onPanel = tone === 'panel';

  useEffect(() => {
    offset.set(withTiming(index * width, TIMING));
  }, [index, width, offset]);

  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }));

  function choose(next) {
    if (next === value) return;
    haptics.select();
    onChange(next);
  }

  return (
    <View
      style={[styles.track, { backgroundColor: onPanel ? colors.panelRaised : colors.bgSunken }]}
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width - PAD * 2)}
      accessibilityRole="tablist"
    >
      {width > 0 ? (
        <Animated.View
          style={[
            styles.thumb,
            { width, backgroundColor: onPanel ? colors.accent : colors.card },
            onPanel ? null : shadow(1, colors.shadow),
            thumbStyle,
          ]}
        />
      ) : null}
      {options.map((option) => {
        const isSelected = option.value === value;
        const color = onPanel
          ? isSelected
            ? colors.onAccent
            : colors.textOnPanelMuted
          : isSelected
            ? colors.text
            : colors.textMuted;
        return (
          <Pressable
            key={option.value}
            onPress={() => choose(option.value)}
            style={styles.segment}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
          >
            <Text style={[type.chip, { color }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: HEIGHT, borderRadius: HEIGHT / 2, padding: PAD, flexDirection: 'row' },
  thumb: { position: 'absolute', top: PAD, bottom: PAD, left: PAD, borderRadius: (HEIGHT - PAD * 2) / 2 },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

export const SEGMENT_RADIUS = radius.field;
