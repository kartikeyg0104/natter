/**
 * Inbox: every conversation in one list, newest activity first.
 * Search and filter chips (All, Unread, Direct, Groups) narrow it down;
 * the pencil starts a new conversation from Contacts.
 */
import Archive from 'lucide-react-native/icons/archive';
import Inbox from 'lucide-react-native/icons/inbox';
import SquarePen from 'lucide-react-native/icons/square-pen';
import Search from 'lucide-react-native/icons/search';
import WifiOff from 'lucide-react-native/icons/wifi-off';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  LinearTransition,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatActions } from '../../src/components/inbox/ChatActions';
import { StoriesRail } from '../../src/components/status/StoriesRail';
import { Aurora } from '../../src/components/kit/Aurora';
import { ConversationRow } from '../../src/components/inbox/ConversationRow';
import { Icon } from '../../src/components/kit/Icon';
import { FilterChip } from '../../src/components/inbox/FilterChip';
import { EmptyState } from '../../src/components/kit/EmptyState';
import { IconButton } from '../../src/components/kit/IconButton';
import { ListSkeleton } from '../../src/components/kit/Skeleton';
import { TextField } from '../../src/components/kit/TextField';
import { durations, EASE_IN_OUT } from '../../src/constants/motion';
import { space, type } from '../../src/constants/theme';
import { filterInbox, INBOX_FILTERS } from '../../src/inbox/inboxSummary';
import { useInbox } from '../../src/hooks/useInbox';
import { useStore } from '../../src/hooks/useStore';
import { meStore } from '../../src/store/socialStores';
import { useTheme } from '../../src/hooks/useTheme';
import { log } from '../../src/utils/logger';

const ROW_MOVE = LinearTransition.duration(durations.indicator).easing(EASE_IN_OUT);

/** The phone-number prompt shows once per app launch. */
let hasPromptedSetup = false;

function openChat(id) {
  log.nav(`inbox -> chat/${id}`);
  router.push(`/chat/${id}`);
}

export default function InboxScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const inbox = useInbox();
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [actionsFor, setActionsFor] = useState(null);
  const me = useStore(meStore, (state) => state.me);
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.set(event.contentOffset.y);
  });
  // The big title shrinks and the summary fades as the list scrolls up.
  const titleStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(scrollY.get(), [0, 80], [1, 0.78], Extrapolation.CLAMP) },
      { translateX: interpolate(scrollY.get(), [0, 80], [0, -14], Extrapolation.CLAMP) },
    ],
  }));
  const summaryStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.get(), [0, 50], [1, 0], Extrapolation.CLAMP),
    height: interpolate(scrollY.get(), [0, 50], [17, 0], Extrapolation.CLAMP),
  }));
  const shadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.get(), [0, 40], [0, 1], Extrapolation.CLAMP),
  }));

  useEffect(() => {
    if (!me || me.phoneNumber || hasPromptedSetup) return;
    hasPromptedSetup = true;
    router.push({ pathname: '/profile-edit', params: { setup: '1' } });
  }, [me]);

  const rows = filterInbox(inbox.rows, filter, query);
  const isLoading = inbox.status === 'loading' || inbox.status === 'idle';
  const hasNoChats = inbox.status === 'ready' && !inbox.rows.length;

  function renderEmpty() {
    if (isLoading) return <ListSkeleton />;
    if (inbox.status === 'error') {
      return (
        <EmptyState
          icon={WifiOff}
          title="Couldn't load your conversations"
          message={inbox.error}
          actionLabel="Try again"
          onAction={inbox.refresh}
        />
      );
    }
    if (inbox.status === 'ready' && !inbox.rows.length && inbox.archivedCount) {
      return (
        <EmptyState icon={Archive} title="Everything is archived" message="Open Archived above to see those chats." />
      );
    }
    if (hasNoChats) {
      return (
        <EmptyState
          icon={Inbox}
          title="No conversations yet"
          message="Pick someone from Contacts to send your first message."
          actionLabel="Open contacts"
          onAction={() => router.navigate('/contacts')}
        />
      );
    }
    return (
      <EmptyState
        icon={Search}
        title="Nothing matches"
        message={query ? `No conversation mentions "${query.trim()}".` : 'No conversations in this view.'}
      />
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <Aurora />
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Animated.Text style={[type.title, styles.titleOrigin, { color: colors.text }, titleStyle]} accessibilityRole="header">
            Inbox
          </Animated.Text>
          <Animated.Text style={[type.meta, { color: colors.textMuted }, summaryStyle]} numberOfLines={1}>
            {inbox.summary}
          </Animated.Text>
        </View>
        <IconButton
          icon={SquarePen}
          variant="tinted"
          size={44}
          accessibilityLabel="New conversation"
          onPress={() => router.navigate('/contacts')}
        />
      </View>

      <View style={styles.search}>
        <TextField
          value={query}
          onChangeText={setQuery}
          placeholder="Search conversations"
          icon={Search}
          inputProps={{ returnKeyType: 'search', clearButtonMode: 'while-editing' }}
        />
      </View>

      <Animated.View pointerEvents="none" style={[styles.shade, { backgroundColor: colors.line }, shadeStyle]} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipRow}
      >
        {INBOX_FILTERS.map((option) => (
          <FilterChip
            key={option.value}
            label={option.label}
            isSelected={filter === option.value}
            onPress={() => setFilter(option.value)}
          />
        ))}
      </ScrollView>

      <Animated.FlatList
        data={isLoading || inbox.status === 'error' ? [] : rows}
        keyExtractor={(row) => row.id}
        itemLayoutAnimation={Platform.OS === 'web' ? undefined : ROW_MOVE}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={({ item, index }) => (
          <ConversationRow
            row={item}
            index={index}
            showDivider={index < rows.length - 1}
            onPress={() => openChat(item.id)}
            onLongPress={() => setActionsFor(item)}
          />
        )}
        ListHeaderComponent={
          <>
          {filter === 'all' && !query ? <StoriesRail /> : null}
          {inbox.archivedCount && filter === 'all' && !query ? (
            <Pressable
              onPress={() => router.push('/archived')}
              accessibilityRole="button"
              accessibilityLabel={`Archived, ${inbox.archivedCount} chats`}
              style={({ pressed }) => [styles.archived, pressed ? { backgroundColor: colors.bgSunken } : null]}
            >
              <View style={[styles.archivedIcon, { backgroundColor: colors.accentSoft }]}>
                <Icon as={Archive} color={colors.accent} size={20} />
              </View>
              <Text style={[type.bodyStrong, styles.grow, { color: colors.text }]}>Archived</Text>
              <Text style={[type.meta, { color: colors.textMuted }]}>{inbox.archivedCount}</Text>
            </Pressable>
          ) : null}
          </>
        }
        ListEmptyComponent={renderEmpty()}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={inbox.isRefreshing}
            onRefresh={inbox.refresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      />
      <ChatActions row={actionsFor} onClose={() => setActionsFor(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    paddingBottom: space.sm,
  },
  titleBlock: { flex: 1, gap: 2 },
  titleOrigin: { transformOrigin: 'left center' },
  shade: { height: StyleSheet.hairlineWidth, marginHorizontal: space.md },
  search: { paddingHorizontal: space.md },
  chipRow: { flexGrow: 0 },
  chips: { gap: space.xs, paddingHorizontal: space.md, paddingVertical: space.sm },
  list: { paddingBottom: space.xl, flexGrow: 1 },
  archived: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingVertical: 10 },
  archivedIcon: { width: 50, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  grow: { flex: 1 },
});
