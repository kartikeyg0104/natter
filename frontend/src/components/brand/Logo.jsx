/**
 * Logo: the Natter mark (a cobalt speech tile with a marigold dot, drawn
 * in SVG) and, optionally, the wordmark beside it.
 */
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { BRAND } from '../../constants/brand';
import { fonts } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';

/** @param {{ size?: number }} props */
export function LogoMark({ size = 56 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityLabel={`${BRAND.name} logo`}>
      <Rect x="0" y="0" width="64" height="64" rx="20" fill="#2F45D8" />
      <Path
        d="M18 22a6 6 0 0 1 6-6h16a6 6 0 0 1 6 6v12a6 6 0 0 1-6 6H30l-8 7v-7h0a4 4 0 0 1-4-4z"
        fill="#FFFFFF"
      />
      <Circle cx="47" cy="17" r="7" fill="#FFC93C" stroke="#2F45D8" strokeWidth="3" />
    </Svg>
  );
}

/** @param {{ size?: number }} props mark size; the word scales with it */
export function Logo({ size = 56 }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel={BRAND.name}>
      <LogoMark size={size} />
      <Text style={[styles.word, { color: colors.text, fontSize: size * 0.72, lineHeight: size * 0.86 }]}>
        {BRAND.name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  word: { fontFamily: fonts.display, letterSpacing: -1.5 },
});
