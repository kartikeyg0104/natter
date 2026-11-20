/**
 * Button: a full-width, 54-high pill for a screen's main action.
 * Variants: primary (brand gradient), secondary (tinted), danger, panel (on the dark
 * diagnostics panel). Status: idle, loading (spinner) or success (check).
 */
import Check from 'lucide-react-native/icons/check';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { softPop } from '../../constants/motion';
import { fonts, radius, space } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { Gradient } from './Gradient';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';

const POP = softPop();
const HEIGHT = 54;

/**
 * @param {object} props
 * @param {string} props.label
 * @param {() => void} [props.onPress]
 * @param {'idle' | 'loading' | 'success'} [props.status='idle']
 * @param {'primary' | 'secondary' | 'danger' | 'panel'} [props.variant='primary']
 * @param {import('react').ComponentType<any>} [props.icon]
 * @param {boolean} [props.disabled]
 */
export function Button({ label, onPress, status = 'idle', variant = 'primary', icon, disabled }) {
  const { colors } = useTheme();
  const look = {
    primary: { bg: colors.accent, fg: '#FFFFFF' },
    secondary: { bg: colors.accentSoft, fg: colors.accent },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    panel: { bg: colors.panelRaised, fg: colors.textOnPanel },
  }[variant];
  const isBusy = status !== 'idle';

  return (
    <PressableScale
      onPress={isBusy ? undefined : onPress}
      disabled={disabled}
      scaleTo={0.98}
      accessibilityLabel={label}
    >
      <Shell isGradient={variant === 'primary'} style={[styles.box, variant === 'primary' ? null : { backgroundColor: look.bg }]}>
        {status === 'loading' ? (
          <ActivityIndicator color={look.fg} accessibilityLabel="Loading" />
        ) : status === 'success' ? (
          <Animated.View entering={POP}>
            <Icon as={Check} color={look.fg} size={24} />
          </Animated.View>
        ) : (
          <>
            {icon ? <Icon as={icon} color={look.fg} size={19} /> : null}
            <Text style={[styles.label, { color: look.fg }]}>{label}</Text>
          </>
        )}
      </Shell>
    </PressableScale>
  );
}

function Shell({ isGradient, style, children }) {
  return isGradient ? <Gradient style={style}>{children}</Gradient> : <View style={style}>{children}</View>;
}

const styles = StyleSheet.create({
  box: {
    height: HEIGHT,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: space.xs,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
  },
  label: { fontFamily: fonts.semibold, fontSize: 16 },
});
