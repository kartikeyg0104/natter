/**
 * DiagnosticsTabBar: the five Diagnostics sections along the bottom, where
 * the thumb is. The active one sits on a cobalt block that slides between
 * sections; Network shows a red dot when a request failed.
 */
import ArrowDownUp from 'lucide-react-native/icons/arrow-down-up';
import Gauge from 'lucide-react-native/icons/gauge';
import ScrollText from 'lucide-react-native/icons/scroll-text';
import SlidersHorizontal from 'lucide-react-native/icons/sliders-horizontal';
import Workflow from 'lucide-react-native/icons/workflow';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { durations, EASE_IN_OUT } from '../../constants/motion';
import { type } from '../../constants/theme';
import { DIAGNOSTICS_TABS } from '../../debug/diagnosticsStore';
import { useTheme } from '../../hooks/useTheme';
import { haptics } from '../../utils/haptics';
import { Icon } from '../kit/Icon';

const ICONS = {
  overview: Gauge,
  flow: Workflow,
  network: ArrowDownUp,
  logs: ScrollText,
  tools: SlidersHorizontal,
};
const LABELS = { overview: 'Status', flow: 'Flow', network: 'Network', logs: 'Logs', tools: 'Tools' };
const HEIGHT = 56;
const PAD = 4;
const GLIDE = { duration: durations.indicator, easing: EASE_IN_OUT };

/**
 * @param {object} props
 * @param {string} props.tab
 * @param {(tab: string) => void} props.onChange
 * @param {number} [props.problems]
 */
export function DiagnosticsTabBar({ tab, onChange, problems = 0 }) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const slot = (width - PAD * 2) / DIAGNOSTICS_TABS.length;
  const index = Math.max(0, DIAGNOSTICS_TABS.indexOf(tab));
  const x = useSharedValue(0);

  useEffect(() => {
    x.set(withTiming(index * slot, GLIDE));
  }, [index, slot, x]);

  const blockStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  return (
    <View
      style={[styles.bar, { backgroundColor: colors.panelRaised }]}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      accessibilityRole="tablist"
    >
      {width ? (
        <Animated.View
          style={[styles.block, { width: slot, backgroundColor: colors.accent }, blockStyle]}
        />
      ) : null}
      {DIAGNOSTICS_TABS.map((name) => {
        const isActive = name === tab;
        const tint = isActive ? colors.onAccent : colors.textOnPanelMuted;
        return (
          <Pressable
            key={name}
            style={styles.item}
            onPress={() => {
              if (isActive) return;
              haptics.select();
              onChange(name);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={LABELS[name]}
          >
            <View>
              <Icon as={ICONS[name]} color={tint} size={19} />
              {name === 'network' && problems > 0 ? (
                <View style={[styles.alert, { backgroundColor: colors.dangerOnPanel }]} />
              ) : null}
            </View>
            <Text style={[type.micro, { color: tint }]}>{LABELS[name]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: HEIGHT,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    padding: PAD,
  },
  block: { position: 'absolute', left: PAD, top: PAD, bottom: PAD, borderRadius: 12 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, height: HEIGHT - PAD * 2 },
  alert: { position: 'absolute', right: -4, top: -2, width: 8, height: 8, borderRadius: 4 },
});
