/**
 * Updates: 24-hour status updates from you and the people you chat with.
 * Your own row at the top (tap to view, or add text / a photo), then
 * Recent (not seen yet) and Viewed.
 */
import Camera from 'lucide-react-native/icons/camera';
import CircleDashed from 'lucide-react-native/icons/circle-dashed';
import Pencil from 'lucide-react-native/icons/pencil';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { friendlyMessage } from '../../src/api/ApiError';
import { uploadFile } from '../../src/api/files';
import { postStatus } from '../../src/api/social';
import { showToast } from '../../src/alerts/alertStore';
import { Aurora } from '../../src/components/kit/Aurora';
import { EmptyState } from '../../src/components/kit/EmptyState';
import { IconButton } from '../../src/components/kit/IconButton';
import { StatusRing } from '../../src/components/status/StatusRing';
import { radius, space, type } from '../../src/constants/theme';
import { useStore } from '../../src/hooks/useStore';
import { useTheme } from '../../src/hooks/useTheme';
import { primeImage } from '../../src/store/imageCache';
import { directoryStore } from '../../src/store/directoryStore';
import { sessionStore } from '../../src/store/sessionStore';
import { featuresStore, loadStatus, statusStore } from '../../src/store/socialStores';
import { toDataUri } from '../../src/utils/fileData';
import { formatChatTime } from '../../src/utils/format';
import { pickPhoto } from '../../src/utils/pickPhoto';

export default function Updates() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const hasStatus = useStore(featuresStore, (s) => s.features.includes('status'));
  const { mine, others, status } = useStore(statusStore);
  const usersById = useStore(directoryStore, (s) => s.byId);
  const myName = useStore(sessionStore, (s) => s.name);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  async function refresh() {
    setIsRefreshing(true);
    await loadStatus();
    setIsRefreshing(false);
  }

  async function postPhoto() {
    try {
      const photo = await pickPhoto();
      if (!photo) return;
      setIsPosting(true);
      const file = await uploadFile({ fileName: photo.fileName, mimeType: photo.mimeType, data: photo.data });
      primeImage(file.id, toDataUri(photo.mimeType, photo.data));
      await postStatus({ file_id: file.id });
      await loadStatus();
      showToast({ title: 'Status posted', icon: 'image' });
    } catch (error) {
      Alert.alert('Status not posted', friendlyMessage(error));
    } finally {
      setIsPosting(false);
    }
  }

  if (!hasStatus) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
        <Text style={[type.title, styles.title, { color: colors.text }]}>Updates</Text>
        <EmptyState icon={CircleDashed} title="Not on this server" message="Status updates need the Natter server." />
      </View>
    );
  }

  const recent = others.filter((group) => !group.allViewed);
  const viewed = others.filter((group) => group.allViewed);
  const latestMine = mine[mine.length - 1];

  const row = (group, index) => {
    const user = usersById[group.userId];
    const latest = group.items[group.items.length - 1];
    return (
      <Animated.View key={group.userId} entering={FadeInDown.delay(Math.min(index, 8) * 50).duration(320)}>
      <Pressable
        key={group.userId}
        onPress={() => router.push(`/status/${group.userId}`)}
        accessibilityRole="button"
        accessibilityLabel={`${user?.name ?? 'Someone'}'s status, ${group.items.length} updates`}
        style={({ pressed }) => [styles.row, pressed ? { backgroundColor: colors.bgSunken } : null]}
      >
        <StatusRing name={user?.name ?? ''} state={group.allViewed ? 'seen' : 'unseen'} />
        <View style={styles.grow}>
          <Text style={[type.bodyStrong, { color: colors.text }]}>{user?.name ?? 'Unknown'}</Text>
          <Text style={[type.meta, { color: colors.textMuted }]}>{latest ? formatChatTime(latest.createdAt) : ''}</Text>
        </View>
      </Pressable>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <Aurora />
      <View style={styles.header}>
        <Text style={[type.title, styles.grow, { color: colors.text }]} accessibilityRole="header">
          Updates
        </Text>
        <IconButton icon={Camera} variant="tinted" size={44} accessibilityLabel="Post a photo status" onPress={postPhoto} />
        <IconButton icon={Pencil} variant="tinted" size={44} accessibilityLabel="Post a text status" onPress={() => router.push('/status-new')} />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={colors.accent} colors={[colors.accent]} />}
      >
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Pressable
            onPress={() => (mine.length ? router.push('/status/me') : router.push('/status-new'))}
            accessibilityRole="button"
            accessibilityLabel={mine.length ? 'View your status' : 'Add a status update'}
            style={styles.row}
          >
            <StatusRing name={myName} state={mine.length ? 'seen' : 'none'} />
            <View style={styles.grow}>
              <Text style={[type.bodyStrong, { color: colors.text }]}>My status</Text>
              <Text style={[type.meta, { color: colors.textMuted }]}>
                {isPosting
                  ? 'Posting…'
                  : mine.length
                    ? `${mine.length} ${mine.length === 1 ? 'update' : 'updates'} · ${formatChatTime(latestMine.createdAt)}`
                    : 'Share a thought or a photo for 24 hours'}
              </Text>
            </View>
          </Pressable>
        </View>

        {recent.length ? (
          <View style={styles.section}>
            <Text style={[type.label, styles.sectionTitle, { color: colors.textMuted }]}>Recent</Text>
            <View style={[styles.card, { backgroundColor: colors.card }]}>{recent.map(row)}</View>
          </View>
        ) : null}
        {viewed.length ? (
          <View style={styles.section}>
            <Text style={[type.label, styles.sectionTitle, { color: colors.textMuted }]}>Viewed</Text>
            <View style={[styles.card, { backgroundColor: colors.card }]}>{viewed.map(row)}</View>
          </View>
        ) : null}
        {status === 'ready' && !others.length ? (
          <EmptyState
            icon={CircleDashed}
            title="No updates yet"
            message="When people you chat with post a status, it shows here for 24 hours."
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  title: { paddingHorizontal: space.md, paddingTop: space.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.md, paddingTop: space.sm, paddingBottom: space.sm },
  grow: { flex: 1, gap: 2 },
  content: { padding: space.md, paddingTop: space.xs, gap: space.md, paddingBottom: space.xxl },
  card: { borderRadius: radius.card, overflow: 'hidden', paddingVertical: space.xxs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.sm, paddingVertical: space.xs },
  section: { gap: 6 },
  sectionTitle: { paddingHorizontal: space.xxs },
});
