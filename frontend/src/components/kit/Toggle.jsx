/**
 * Toggle: the platform switch in Natter colours.
 */
import { Switch } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { haptics } from '../../utils/haptics';

/**
 * @param {{ value: boolean, onChange: (value: boolean) => void, accessibilityLabel: string }} props
 */
export function Toggle({ value, onChange, accessibilityLabel }) {
  const { colors } = useTheme();
  return (
    <Switch
      value={value}
      onValueChange={(next) => {
        haptics.select();
        onChange(next);
      }}
      trackColor={{ false: colors.line, true: colors.accent }}
      thumbColor="#FFFFFF"
      activeThumbColor="#FFFFFF"
      ios_backgroundColor={colors.line}
      accessibilityLabel={accessibilityLabel}
    />
  );
}
