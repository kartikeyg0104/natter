/**
 * Aurora: soft glowing colour blobs behind a screen's header. Purely
 * decorative; sits behind everything and ignores touches.
 */
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

/** @param {{ height?: number }} props */
export function Aurora({ height = 320 }) {
  const { colors, isDark } = useTheme();
  const strength = isDark ? 0.32 : 0.22;
  return (
    <View pointerEvents="none" style={[styles.wrap, { height }]}>
      <View style={[styles.blob, styles.one, { backgroundColor: '#4F6BFF', opacity: strength }]} />
      <View style={[styles.blob, styles.two, { backgroundColor: '#7A4FE0', opacity: strength * 0.9 }]} />
      <View style={[styles.blob, styles.three, { backgroundColor: '#FFC93C', opacity: strength * 0.7 }]} />
      <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={[`${colors.bg}00`, colors.bg]}
        start={{ x: 0, y: 0.35 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
  blob: { position: 'absolute', borderRadius: 999 },
  one: { width: 300, height: 300, top: -150, left: -80 },
  two: { width: 260, height: 260, top: -120, right: -90 },
  three: { width: 180, height: 180, top: 40, left: 140 },
});
