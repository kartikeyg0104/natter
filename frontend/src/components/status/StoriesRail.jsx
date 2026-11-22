/**
 * StoriesRail: a horizontal row of status rings under the Inbox header.
 * "Your story" first (tap to add or view yours), then people with updates,
 * unseen ones first.
 */
import Plus from 'lucide-react-native/icons/plus';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { space, type } from '../../constants/theme';
import { useStore } from '../../hooks/useStore';
import { useTheme } from '../../hooks/useTheme';
import { directoryStore } from '../../store/directoryStore';
import { sessionStore } from '../../store/sessionStore';
import { featuresStore, statusStore } from '../../store/socialStores';
import { Gradient } from '../kit/Gradient';
import { Icon } from '../kit/Icon';
import { StatusRing } from './StatusRing';

const SIZE = 56;

export function StoriesRail() {
  const { colors } = useTheme();
  const hasStatus = useStore(featuresStore, (s) => s.features.includes('status'));
  const { mine, others } = useStore(statusStore);
  const usersById = useStore(directoryStore, (s) => s.byId);
  const myName = useStore(sessionStore, (s) => s.name);
  if (!hasStatus) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      <Pressable
        onPress={() => router.push(mine.length ? '/status/me' : '/status-new')}
        accessibilityRole="button"
        accessibilityLabel={mine.length ? 'View your story' : 'Add to your story'}
        style={styles.item}
      >
        <View>
          <StatusRing name={myName} size={SIZE} state={mine.length ? 'seen' : 'none'} />
          <Gradient style={[styles.plus, { borderColor: colors.bg }]}>
            <Icon as={Plus} color="#FFFFFF" size={14} />
          </Gradient>
        </View>
        <Text style={[type.caption, { color: colors.textMuted }]} numberOfLines={1}>
          Your story
        </Text>
      </Pressable>
      {others.map((group) => {
        const name = usersById[group.userId]?.name ?? '';
        return (
          <Pressable
            key={group.userId}
            onPress={() => router.push(`/status/${group.userId}`)}
            accessibilityRole="button"
            accessibilityLabel={`${name}'s story${group.allViewed ? '' : ', new'}`}
            style={styles.item}
          >
            <StatusRing name={name} size={SIZE} state={group.allViewed ? 'seen' : 'unseen'} />
            <Text
              style={[type.caption, { color: group.allViewed ? colors.textMuted : colors.text }]}
              numberOfLines={1}
            >
              {name.split(' ')[0]}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.xs },
  item: { width: SIZE + 14, alignItems: 'center', gap: 4 },
  plus: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
