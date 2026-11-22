/**
 * DiagnosticsChip: a compact filter pill for the dark Diagnostics sheet.
 * Selected chips turn white with dark text; others sit on slabRaised.
 */
import { Pressable, StyleSheet, Text } from 'react-native';
import { radius, space, type } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { haptics } from '../../utils/haptics';

const HEIGHT = 28;

/**
 * @param {object} props
 * @param {string} props.label
 * @param {boolean} props.selected
 * @param {() => void} props.onPress
 */
export function DiagnosticsChip({ label, selected, onPress }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => {
        haptics.select();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label} filter`}
      style={[styles.chip, { backgroundColor: selected ? colors.textOnPanel : colors.panelRaised }]}
    >
      <Text style={[type.chip, { color: selected ? '#0A0D0C' : colors.textOnPanelMuted }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: HEIGHT,
    paddingHorizontal: space.sm,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
