/**
 * GroupAvatar: a 2x2 mosaic of member tiles inside one squircle, so a group
 * reads as a set of people at a glance. One or two members fill halves.
 */
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AVATAR_CORNER, fonts } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { initials, swatchFor } from './avatarArt';

function GroupAvatarBase({ names, size = 44 }) {
  const { colors } = useTheme();
  const list = (names ?? []).slice(0, 4);
  const extra = Math.max(0, (names?.length ?? 0) - 3);
  const cells = list.length >= 4 ? [...list.slice(0, 3), `+${extra}`] : list;
  const gap = 2;
  const half = (size - gap) / 2;

  return (
    <View
      style={[
        styles.box,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * AVATAR_CORNER),
          backgroundColor: colors.bgSunken,
          gap,
        },
      ]}
      accessibilityRole="image"
      accessibilityLabel={`group of ${names?.length ?? 0}`}
    >
      {cells.map((name, index) => {
        const isMore = name.startsWith('+') && index === 3;
        const swatch = isMore ? { bg: colors.text, fg: colors.bg } : swatchFor(name);
        const wide = cells.length <= 2 || (cells.length === 3 && index === 2);
        return (
          <View
            key={`${name}-${index}`}
            style={[
              styles.cell,
              {
                width: wide && cells.length === 3 ? size : cells.length === 1 ? size : half,
                height: cells.length <= 2 ? size : half,
                backgroundColor: swatch.bg,
              },
            ]}
          >
            <Text
              style={[styles.text, { color: swatch.fg, fontSize: Math.max(9, Math.round(size * 0.2)) }]}
              allowFontScaling={false}
            >
              {isMore ? name : initials(name).slice(0, 1)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export const GroupAvatar = memo(GroupAvatarBase);

const styles = StyleSheet.create({
  box: { overflow: 'hidden', flexDirection: 'row', flexWrap: 'wrap' },
  cell: { alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: fonts.display },
});
