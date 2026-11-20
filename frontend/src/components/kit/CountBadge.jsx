/**
 * CountBadge: the marigold unread count. Renders nothing for zero.
 */
import { Platform, StyleSheet, Text } from 'react-native';
import Animated from 'react-native-reanimated';
import { durations, softPop } from '../../constants/motion';
import { fonts } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { formatBadgeCount } from '../../utils/format';

const POP = softPop(durations.fast);
/** Entering keyframes drop this view's styles in the web build, so the pop is native-only. */
const CAN_POP = Platform.OS !== 'web';
const SIZE = 20;

/**
 * @param {object} props
 * @param {number} props.count
 * @param {object} [props.style]
 * @param {boolean} [props.isAnimated=true] false inside recycled list rows
 * @param {boolean} [props.isQuiet] grey, for muted chats
 */
export function CountBadge({ count, style, isAnimated = true, isQuiet = false }) {
  const { colors } = useTheme();
  const label = formatBadgeCount(count);
  if (!label) return null;
  return (
    <Animated.View
      entering={isAnimated && CAN_POP ? POP : undefined}
      style={[styles.badge, { backgroundColor: isQuiet ? colors.bgSunken : colors.highlight }, style]}
      accessibilityLabel={`${count} unread`}
    >
      <Text style={[styles.text, { color: isQuiet ? colors.textMuted : colors.onHighlight }]} allowFontScaling={false}>
        {label}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontFamily: fonts.semibold, fontSize: 11 },
});
