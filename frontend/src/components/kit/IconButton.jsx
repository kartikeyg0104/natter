/**
 * IconButton: a round icon control.
 * Variants: plain (no fill), tinted (soft accent), filled (cobalt), panel
 * (on the dark diagnostics panel).
 */
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { CountBadge } from './CountBadge';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';

/**
 * @param {object} props
 * @param {import('react').ComponentType<any>} props.icon
 * @param {string} props.accessibilityLabel
 * @param {() => void} [props.onPress]
 * @param {'plain' | 'tinted' | 'filled' | 'panel'} [props.variant='plain']
 * @param {number} [props.size=40]
 * @param {number} [props.badge]
 * @param {boolean} [props.disabled]
 * @param {string} [props.color] icon colour override
 */
export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  variant = 'plain',
  size = 40,
  badge,
  disabled,
  color,
}) {
  const { colors } = useTheme();
  const look = {
    plain: { bg: 'transparent', fg: colors.text },
    tinted: { bg: colors.accentSoft, fg: colors.accent },
    filled: { bg: colors.accent, fg: colors.onAccent },
    panel: { bg: colors.panelRaised, fg: colors.textOnPanel },
  }[variant];

  return (
    <PressableScale onPress={onPress} disabled={disabled} accessibilityLabel={accessibilityLabel}>
      <View
        style={[
          styles.box,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: look.bg },
        ]}
      >
        <Icon as={icon} color={color ?? look.fg} size={Math.round(size * 0.52)} />
      </View>
      <CountBadge count={badge} style={styles.badge} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -4, right: -4 },
});
