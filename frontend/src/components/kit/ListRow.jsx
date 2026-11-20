/**
 * ListRow: one line in a grouped list (settings, contacts, members).
 * leading / trailing are free slots; a chevron shows when tappable unless
 * something else is trailing.
 */
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { space, type } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { Icon } from './Icon';

/**
 * @param {object} props
 * @param {string} props.title
 * @param {string} [props.subtitle]
 * @param {import('react').ReactNode} [props.leading]
 * @param {import('react').ReactNode} [props.trailing]
 * @param {() => void} [props.onPress]
 * @param {'default' | 'danger' | 'accent'} [props.tone='default']
 * @param {boolean} [props.showDivider=false] hairline under the row
 * @param {string} [props.accessibilityLabel]
 */
export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
  tone = 'default',
  showDivider = false,
  accessibilityLabel,
}) {
  const { colors } = useTheme();
  const titleColor = tone === 'danger' ? colors.danger : tone === 'accent' ? colors.accent : colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel ?? title}
      style={({ pressed }) => [styles.row, pressed && onPress ? { backgroundColor: colors.cardPressed } : null]}
    >
      {leading}
      <View style={[styles.body, showDivider ? { borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth } : null]}>
        <View style={styles.text}>
          <Text style={[type.bodyStrong, { color: titleColor }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[type.meta, { color: colors.textMuted }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {trailing ?? (onPress && tone === 'default' ? <Icon as={ChevronRight} color={colors.textFaint} size={18} /> : null)}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingLeft: space.md },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
    paddingRight: space.md,
    minHeight: 56,
  },
  text: { flex: 1, gap: 2 },
});
