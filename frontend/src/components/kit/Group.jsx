/**
 * Group: a titled card that holds ListRows (settings-style grouping).
 */
import { Children, Fragment, isValidElement, cloneElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { radius, space, type } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';

/**
 * @param {object} props
 * @param {string} [props.title]
 * @param {string} [props.footer] help text under the card
 * @param {import('react').ReactNode} props.children
 */
export function Group({ title, footer, children }) {
  const { colors } = useTheme();
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.wrap}>
      {title ? <Text style={[type.label, styles.title, { color: colors.textMuted }]}>{title}</Text> : null}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {rows.map((row, index) => (
          <Fragment key={row.key ?? index}>
            {isValidElement(row) && index < rows.length - 1 && 'title' in (row.props ?? {})
              ? cloneElement(row, { showDivider: true })
              : row}
          </Fragment>
        ))}
      </View>
      {footer ? <Text style={[type.caption, styles.footer, { color: colors.textFaint }]}>{footer}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  title: { paddingHorizontal: space.xxs },
  card: { borderRadius: radius.card, overflow: 'hidden' },
  footer: { paddingHorizontal: space.xxs },
});
