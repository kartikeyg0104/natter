/**
 * AvatarStylePicker: your own picture in each style, as a radio list.
 * Choosing one changes every avatar in the app at once (on this phone).
 */
import Check from 'lucide-react-native/icons/check';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radius, space, type } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { haptics } from '../../utils/haptics';
import { Avatar } from '../avatar/Avatar';
import { AVATAR_STYLES } from '../avatar/avatarArt';
import { Icon } from '../kit/Icon';

/**
 * @param {{ name: string, value: string, onChange: (styleId: string) => void }} props
 */
export function AvatarStylePicker({ name, value, onChange }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {AVATAR_STYLES.map((style) => {
        const isSelected = style.id === value;
        return (
          <Pressable
            key={style.id}
            onPress={() => {
              if (isSelected) return;
              haptics.select();
              onChange(style.id);
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected }}
            accessibilityLabel={`${style.label} pictures`}
            style={[
              styles.option,
              {
                backgroundColor: colors.card,
                borderColor: isSelected ? colors.accent : colors.card,
              },
            ]}
          >
            <Avatar name={name} size={52} styleId={style.id} photoId={null} />
            <Text style={[type.chip, { color: isSelected ? colors.accent : colors.textMuted }]}>
              {style.label}
            </Text>
            {isSelected ? (
              <View style={[styles.check, { backgroundColor: colors.accent }]}>
                <Icon as={Check} color={colors.onAccent} size={12} />
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.xs },
  option: {
    flex: 1,
    alignItems: 'center',
    gap: space.xs,
    paddingVertical: space.md,
    borderRadius: radius.card,
    borderWidth: 2,
  },
  check: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
