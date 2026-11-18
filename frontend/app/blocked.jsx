/**
 * Blocked contacts: everyone you blocked. Tap Unblock to let them message
 * you and see your updates again.
 */
import Ban from 'lucide-react-native/icons/ban';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import { router } from 'expo-router';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { friendlyMessage } from '../src/api/ApiError';
import { showToast } from '../src/alerts/alertStore';
import { Avatar } from '../src/components/avatar/Avatar';
import { EmptyState } from '../src/components/kit/EmptyState';
import { IconButton } from '../src/components/kit/IconButton';
import { ListRow } from '../src/components/kit/ListRow';
import { radius, space, type } from '../src/constants/theme';
import { useStore } from '../src/hooks/useStore';
import { useTheme } from '../src/hooks/useTheme';
import { directoryStore } from '../src/store/directoryStore';
import { blocksStore, setBlocked } from '../src/store/socialStores';

export default function Blocked() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const userIds = useStore(blocksStore, (s) => s.userIds);
  const usersById = useStore(directoryStore, (s) => s.byId);

  async function unblock(userId) {
    try {
      await setBlocked(userId, false);
      showToast({ title: 'Unblocked', detail: usersById[userId]?.name });
    } catch (error) {
      Alert.alert('Not unblocked', friendlyMessage(error));
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={[styles.topBar, { paddingTop: insets.top + space.xxs }]}>
        <IconButton icon={ChevronLeft} accessibilityLabel="Back" onPress={() => router.back()} />
        <Text style={[type.heading, { color: colors.text }]} accessibilityRole="header">
          Blocked contacts
        </Text>
      </View>
      <FlatList
        data={userIds}
        keyExtractor={(id) => id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState icon={Ban} title="No one is blocked" message="Block someone from their contact info screen." />
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <ListRow
              title={usersById[item]?.name ?? 'Unknown'}
              leading={<Avatar name={usersById[item]?.name ?? ''} size={40} />}
              trailing={
                <Pressable
                  onPress={() => unblock(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Unblock ${usersById[item]?.name ?? ''}`}
                  style={[styles.unblock, { backgroundColor: colors.accentSoft }]}
                >
                  <Text style={[type.label, { color: colors.accent }]}>Unblock</Text>
                </Pressable>
              }
            />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.xs, paddingBottom: space.xs },
  list: { padding: space.md, gap: space.xs, flexGrow: 1 },
  card: { borderRadius: radius.card, overflow: 'hidden' },
  unblock: { paddingHorizontal: 12, height: 32, borderRadius: 10, justifyContent: 'center' },
});
