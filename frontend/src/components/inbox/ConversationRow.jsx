/**
 * ConversationRow: one conversation in the Inbox. Avatar (or group mosaic),
 * title and time on the first line, preview and unread count on the second.
 * Unread rows get a bold title and a cobalt bar on the left edge.
 */
import BellOff from 'lucide-react-native/icons/bell-off';
import Camera from 'lucide-react-native/icons/camera';
import Pin from 'lucide-react-native/icons/pin';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { space, type } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { Avatar } from '../avatar/Avatar';
import { GroupAvatar } from '../avatar/GroupAvatar';
import { CountBadge } from '../kit/CountBadge';
import { Gradient } from '../kit/Gradient';
import { Icon } from '../kit/Icon';

const SIZE = 50;

const PRESS = { damping: 15, stiffness: 320 };
/** Only the first screenful cascades in; rows further down just appear. */
const MAX_STAGGER = 10;

function ConversationRowBase({ row, onPress, onLongPress, showDivider, index = 0 }) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const isUnread = row.unread > 0;
  const label = [
    row.kind === 'group' ? `Group ${row.title}` : row.title,
    isUnread ? `${row.unread} unread` : '',
    row.pinned ? 'pinned' : '',
    row.muted ? 'muted' : '',
    row.streak ? `${row.streak} day streak` : '',
    row.typing || (row.hasMessages ? row.preview : ''),
    row.time,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Animated.View
      entering={index < MAX_STAGGER ? FadeInDown.delay(index * 45).duration(320) : undefined}
      style={pressStyle}
    >
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => scale.set(withSpring(0.97, PRESS))}
      onPressOut={() => scale.set(withSpring(1, PRESS))}
      delayLongPress={350}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, pressed ? { backgroundColor: colors.bgSunken } : null]}
    >
      {isUnread ? <View style={[styles.marker, { backgroundColor: colors.accent }]} /> : null}
      {row.kind === 'group' ? (
        <GroupAvatar names={row.names} size={SIZE} />
      ) : (
        <Avatar name={row.title} size={SIZE} />
      )}
      <View
        style={[
          styles.body,
          showDivider ? { borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth } : null,
        ]}
      >
        <View style={styles.line}>
          <Text
            style={[isUnread ? type.bodyStrong : type.body, styles.title, { color: colors.text }]}
            numberOfLines={1}
          >
            {row.title}
            {row.streak ? (
              <Text style={[type.label, { color: colors.textMuted }]}>{`  ${row.streakEnding ? '⏳' : '🔥'} ${row.streak}`}</Text>
            ) : null}
          </Text>
          <Text style={[type.caption, { color: isUnread && !row.muted ? colors.accent : colors.textFaint }]}>
            {row.time}
          </Text>
        </View>
        <View style={styles.line}>
          <Text
            style={[
              type.meta,
              styles.preview,
              { color: row.typing ? colors.accent : isUnread ? colors.text : colors.textMuted },
              row.hasMessages || row.typing ? null : styles.placeholder,
            ]}
            numberOfLines={1}
          >
            {row.typing || row.preview}
          </Text>
          {row.isSnap && !row.typing ? (
            <Gradient kind="sunset" style={styles.snapTag}>
              <Icon as={Camera} color="#FFFFFF" size={12} />
              <Text style={[type.micro, styles.white]}>New snap</Text>
            </Gradient>
          ) : null}
          {row.muted ? <Icon as={BellOff} color={colors.textFaint} size={15} /> : null}
          {row.pinned ? <Icon as={Pin} color={colors.textFaint} size={15} /> : null}
          <CountBadge count={row.unread} isAnimated={false} isQuiet={row.muted} />
        </View>
      </View>
    </Pressable>
    </Animated.View>
  );
}

export const ConversationRow = memo(ConversationRowBase);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingLeft: space.md },
  marker: { position: 'absolute', left: 0, top: 18, bottom: 18, width: 3, borderRadius: 2 },
  body: { flex: 1, gap: 3, paddingVertical: 14, paddingRight: space.md },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  title: { flex: 1 },
  preview: { flex: 1 },
  placeholder: { fontStyle: 'italic' },
  snapTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, height: 22, borderRadius: 11 },
  white: { color: '#FFFFFF' },
});
