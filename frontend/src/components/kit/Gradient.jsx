/**
 * Gradient: the brand gradient as a container (lighter in dark mode).
 */
import { LinearGradient } from 'expo-linear-gradient';
import { gradients } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';

/**
 * @param {object} props
 * @param {'brand' | 'sunset' | 'ring'} [props.kind='brand']
 * @param {object} [props.style]
 * @param {import('react').ReactNode} [props.children]
 */
export function Gradient({ kind = 'brand', style, children }) {
  const { isDark } = useTheme();
  const g = kind === 'brand' && isDark ? gradients.brandDark : gradients[kind];
  return (
    <LinearGradient colors={g.colors} start={g.start} end={g.end} style={style}>
      {children}
    </LinearGradient>
  );
}
