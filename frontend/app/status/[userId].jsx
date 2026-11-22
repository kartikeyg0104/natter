/**
 * Status viewer: one person's updates, full screen, one after another.
 * Bars at the top show progress; each update stays 5 seconds. Tap the
 * right side for next, the left side for previous. On your own updates you
 * see who viewed them and can delete one.
 * Param: userId ("me" for yours).
 */
import Eye from 'lucide-react-native/icons/eye';
import Trash2 from 'lucide-react-native/icons/trash-2';
import X from 'lucide-react-native/icons/x';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { friendlyMessage } from '../../src/api/ApiError';
import { deleteStatus, statusViewers } from '../../src/api/social';
import { showToast } from '../../src/alerts/alertStore';
import { Avatar } from '../../src/components/avatar/Avatar';
import { IconButton } from '../../src/components/kit/IconButton';
import { ListRow } from '../../src/components/kit/ListRow';
import { Sheet } from '../../src/components/kit/Sheet';
import { fonts, radius, space, type } from '../../src/constants/theme';
import { useFileImage } from '../../src/hooks/useFileImage';
import { useStore } from '../../src/hooks/useStore';
import { useTheme } from '../../src/hooks/useTheme';
import { directoryStore } from '../../src/store/directoryStore';
import { sessionStore } from '../../src/store/sessionStore';
import { loadStatus, markStatusViewed, statusStore } from '../../src/store/socialStores';
import { confirmAction } from '../../src/utils/confirm';
import { formatChatTime } from '../../src/utils/format';

const SHOW_MS = 5000;
const TICK_MS = 50;

function PhotoStatus({ fileId }) {
  const image = useFileImage(fileId);
  if (!image.uri) return <ActivityIndicator color="#FFFFFF" />;
  return <Image source={{ uri: image.uri }} style={styles.photo} contentFit="contain" />;
}

export default function StatusViewer() {
  const { userId } = useLocalSearchParams();
  const isMine = userId === 'me';
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const myName = useStore(sessionStore, (s) => s.name);
  const usersById = useStore(directoryStore, (s) => s.byId);
  const items = useStore(statusStore, (s) =>
    isMine ? s.mine : (s.others.find((group) => group.userId === userId)?.items ?? []),
  );
  const [index, setIndex] = useState(() => {
    if (isMine) return 0;
    const firstUnseen = items.findIndex((item) => !item.viewed);
    return firstUnseen < 0 ? 0 : firstUnseen;
  });
  const [elapsed, setElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [viewers, setViewers] = useState(null);

  const item = items[index];
  const name = isMine ? myName : (usersById[userId]?.name ?? 'Unknown');

  useEffect(() => {
    if (item && !isMine) markStatusViewed(item);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, item?.id]);

  useEffect(() => {
    if (!item || isPaused) return undefined;
    const timer = setInterval(() => setElapsed((value) => value + TICK_MS), TICK_MS);
    return () => clearInterval(timer);
  }, [item, isPaused]);

  useEffect(() => {
    if (elapsed >= SHOW_MS) next();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed]);

  useEffect(() => {
    if (!items.length) router.back();
  }, [items.length]);

  function next() {
    setElapsed(0);
    if (index < items.length - 1) setIndex(index + 1);
    else router.back();
  }

  function previous() {
    setElapsed(0);
    if (index > 0) setIndex(index - 1);
  }

  async function showViewers() {
    setIsPaused(true);
    try {
      setViewers(await statusViewers(item.id));
    } catch (error) {
      setIsPaused(false);
      Alert.alert("Couldn't load viewers", friendlyMessage(error));
    }
  }

  function remove() {
    setIsPaused(true);
    confirmAction('Delete this update?', 'It disappears for everyone now.', 'Delete', async () => {
      try {
        await deleteStatus(item.id);
        await loadStatus();
        showToast({ title: 'Status deleted', icon: 'trash' });
        setElapsed(0);
        setIndex(0);
      } catch (error) {
        Alert.alert('Not deleted', friendlyMessage(error));
      } finally {
        setIsPaused(false);
      }
    });
    setIsPaused(false);
  }

  if (!item) return <View style={[styles.screen, { backgroundColor: '#000000' }]} />;

  const background = item.type === 'TEXT' ? (item.background || colors.accent) : '#000000';

  return (
    <View style={[styles.screen, { backgroundColor: background }]}>
      <View style={styles.stage}>
        {item.type === 'IMAGE' && item.fileId ? (
          <PhotoStatus fileId={item.fileId} />
        ) : (
          <Text style={styles.text}>{item.text}</Text>
        )}
        {item.type === 'IMAGE' && item.text ? <Text style={[type.body, styles.caption]}>{item.text}</Text> : null}
      </View>

      <View style={styles.tapZones}>
        <Pressable style={styles.zone} onPress={previous} accessibilityLabel="Previous update" />
        <Pressable style={styles.zone} onPress={next} accessibilityLabel="Next update" />
      </View>

      <View style={[styles.top, { paddingTop: insets.top + space.xs }]} pointerEvents="box-none">
        <View style={styles.bars}>
          {items.map((entry, position) => {
            const fill = position < index ? 1 : position === index ? Math.min(1, elapsed / SHOW_MS) : 0;
            return (
              <View key={entry.id} style={styles.bar}>
                <View style={[styles.barFill, { width: `${fill * 100}%` }]} />
              </View>
            );
          })}
        </View>
        <View style={styles.who}>
          <Avatar name={name} size={36} />
          <View style={styles.grow}>
            <Text style={[type.label, styles.white]}>{isMine ? 'My status' : name}</Text>
            <Text style={[type.caption, styles.dim]}>{formatChatTime(item.createdAt)}</Text>
          </View>
          <IconButton icon={X} color="#FFFFFF" accessibilityLabel="Close" onPress={() => router.back()} />
        </View>
      </View>

      {isMine ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
          <Pressable onPress={showViewers} accessibilityRole="button" style={styles.viewers}>
            <Eye color="#FFFFFF" size={18} />
            <Text style={[type.label, styles.white]}>
              {item.viewCount ?? 0} {item.viewCount === 1 ? 'view' : 'views'}
            </Text>
          </Pressable>
          <IconButton icon={Trash2} color="#FFFFFF" accessibilityLabel="Delete this update" onPress={remove} />
        </View>
      ) : null}

      <Sheet
        visible={Boolean(viewers)}
        onClose={() => {
          setViewers(null);
          setIsPaused(false);
        }}
      >
        <Text style={[type.heading, { color: colors.text }]}>Viewed by</Text>
        <View style={[styles.list, { backgroundColor: colors.bg }]}>
          {viewers?.length ? (
            viewers.map((viewer) => (
              <ListRow
                key={viewer.userId}
                title={usersById[viewer.userId]?.name ?? viewer.name}
                leading={<Avatar name={usersById[viewer.userId]?.name ?? viewer.name} size={36} />}
              />
            ))
          ) : (
            <Text style={[type.meta, styles.empty, { color: colors.textMuted }]}>No views yet.</Text>
          )}
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  stage: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  photo: { width: '100%', height: '100%' },
  text: { fontFamily: fonts.display, fontSize: 30, lineHeight: 38, color: '#FFFFFF', textAlign: 'center' },
  caption: { position: 'absolute', bottom: 120, left: space.lg, right: space.lg, color: '#FFFFFF', textAlign: 'center' },
  tapZones: { ...StyleSheet.absoluteFillObject, flexDirection: 'row' },
  zone: { flex: 1 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: space.sm, gap: space.xs },
  bars: { flexDirection: 'row', gap: 4 },
  bar: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)', overflow: 'hidden' },
  barFill: { height: 3, backgroundColor: '#FFFFFF' },
  who: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  grow: { flex: 1 },
  white: { color: '#FFFFFF' },
  dim: { color: 'rgba(255,255,255,0.75)' },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.md,
  },
  viewers: { flexDirection: 'row', alignItems: 'center', gap: space.xs, padding: space.xs },
  list: { borderRadius: radius.field, overflow: 'hidden' },
  empty: { padding: space.md },
});
