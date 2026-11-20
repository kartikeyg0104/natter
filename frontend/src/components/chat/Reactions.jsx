/**
 * Reactions: the emoji under a bubble, grouped with counts ("❤️ 2  😂").
 * Tapping toggles your own reaction for that emoji.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { shadow, type } from '../../constants/theme';

/**
 * @param {Record<string, string>} reactions userId -> emoji
 * @returns {{ emoji: string, count: number, userIds: string[] }[]}
 */
export function groupReactions(reactions) {
  const groups = new Map();
  Object.entries(reactions ?? {}).forEach(([userId, emoji]) => {
    if (!emoji) return;
    const group = groups.get(emoji) ?? { emoji, count: 0, userIds: [] };
    group.count += 1;
    group.userIds.push(userId);
    groups.set(emoji, group);
  });
  return [...groups.values()].sort((a, b) => b.count - a.count);
}

/**
 * @param {object} props
 * @param {Record<string, string>} props.reactions
 * @param {string} props.myId
 * @param {boolean} props.isMine bubble side
 * @param {object} props.colors
 * @param {(emoji: string) => void} props.onToggle
 */
export function Reactions({ reactions, myId, isMine, colors, onToggle }) {
  const groups = groupReactions(reactions);
  if (!groups.length) return null;
  return (
    <View style={[styles.row, isMine ? styles.mine : null]}>
      {groups.map((group) => {
        const isMineReaction = group.userIds.includes(myId);
        return (
          <Animated.View key={group.emoji} entering={ZoomIn.springify().damping(12)}>
          <Pressable
            onPress={() => onToggle(group.emoji)}
            accessibilityRole="button"
            accessibilityLabel={`${group.emoji} ${group.count}${isMineReaction ? ', yours, tap to remove' : ''}`}
            style={[
              styles.chip,
              { backgroundColor: colors.card, borderColor: isMineReaction ? colors.accent : colors.line },
              shadow(1, colors.shadow),
            ]}
          >
            <Text style={styles.emoji}>{group.emoji}</Text>
            {group.count > 1 ? <Text style={[type.micro, { color: colors.textMuted }]}>{group.count}</Text> : null}
          </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: -6, paddingHorizontal: 6 },
  mine: { justifyContent: 'flex-end' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 24,
    paddingHorizontal: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  emoji: { fontSize: 13 },
});
