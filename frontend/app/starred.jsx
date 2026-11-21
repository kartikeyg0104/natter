/**
 * Starred messages: everything you starred, newest first, with the chat it
 * came from. Tap to open that chat; long-press to unstar.
 * Param (optional): conversationId to show one chat only.
 */
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import Star from 'lucide-react-native/icons/star';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { friendlyMessage } from '../src/api/ApiError';
import { listStarred, starMessage } from '../src/api/social';
import { showToast } from '../src/alerts/alertStore';
import { Avatar } from '../src/components/avatar/Avatar';
import { quoteText } from '../src/components/chat/ReplyQuote';
import { EmptyState } from '../src/components/kit/EmptyState';
import { IconButton } from '../src/components/kit/IconButton';
import { radius, space, type } from '../src/constants/theme';
import { useStore } from '../src/hooks/useStore';
import { useTheme } from '../src/hooks/useTheme';
import { chatsStore } from '../src/store/chatsStore';
import { directoryStore } from '../src/store/directoryStore';
import { sessionStore } from '../src/store/sessionStore';
import { conversationTitle } from '../src/utils/conversationTitle';
import { formatDateTime } from '../src/utils/format';

export default function Starred() {
  const { conversationId } = useLocalSearchParams();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const myId = useStore(sessionStore, (s) => s.user?.id ?? '');
  const usersById = useStore(directoryStore, (s) => s.byId);
  const conversations = useStore(chatsStore, (s) => s.conversations);
  const [state, setState] = useState({ status: 'loading', items: [], error: '' });

  const [attempt, setAttempt] = useState(0);
  const load = () => setAttempt((count) => count + 1);

  useEffect(() => {
    let isActive = true;
    listStarred()
      .then((items) => {
        if (!isActive) return;
        const filtered = conversationId ? items.filter((item) => item.conversationId === String(conversationId)) : items;
        setState({ status: 'ready', items: filtered, error: '' });
      })
      .catch((error) => isActive && setState({ status: 'error', items: [], error: friendlyMessage(error) }));
    return () => {
      isActive = false;
    };
  }, [conversationId, attempt]);

  async function unstar(message) {
    try {
      await starMessage(message.id, false);
      setState((current) => ({ ...current, items: current.items.filter((item) => item.id !== message.id) }));
      showToast({ title: 'Removed from starred', icon: 'star' });
    } catch (error) {
      Alert.alert('Not saved', friendlyMessage(error));
    }
  }

  function chatName(id) {
    const chat = conversations.find((item) => item.id === id);
    return chat ? conversationTitle(chat, myId, usersById) : 'Chat';
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={[styles.topBar, { paddingTop: insets.top + space.xxs }]}>
        <IconButton icon={ChevronLeft} accessibilityLabel="Back" onPress={() => router.back()} />
        <Text style={[type.heading, { color: colors.text }]} accessibilityRole="header">
          Starred messages
        </Text>
      </View>
      {state.status === 'loading' ? <ActivityIndicator style={styles.loader} color={colors.accent} /> : null}
      {state.status === 'error' ? (
        <EmptyState icon={Star} title="Couldn't load starred messages" message={state.error} actionLabel="Try again" onAction={load} />
      ) : null}
      {state.status === 'ready' ? (
        <FlatList
          data={state.items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState icon={Star} title="No starred messages" message="Long-press a message and choose Star to keep it here." />
          }
          renderItem={({ item }) => {
            const sender = item.senderId === myId ? 'You' : (usersById[item.senderId]?.name ?? 'Unknown');
            return (
              <Pressable
                onPress={() => router.push(`/chat/${item.conversationId}`)}
                onLongPress={() => unstar(item)}
                accessibilityRole="button"
                accessibilityHint="Opens the chat. Long press to unstar."
                style={[styles.card, { backgroundColor: colors.card }]}
              >
                <View style={styles.head}>
                  <Avatar name={sender === 'You' ? usersById[myId]?.name ?? '' : sender} size={28} />
                  <Text style={[type.label, styles.grow, { color: colors.text }]} numberOfLines={1}>
                    {sender} → {chatName(item.conversationId)}
                  </Text>
                  <Text style={[type.caption, { color: colors.textFaint }]}>{formatDateTime(item.createdAt)}</Text>
                </View>
                <Text style={[type.body, { color: colors.text }]} numberOfLines={4}>
                  {quoteText(item)}
                </Text>
              </Pressable>
            );
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.xs, paddingBottom: space.xs },
  loader: { marginTop: space.xxl },
  list: { padding: space.md, gap: space.sm, flexGrow: 1 },
  card: { padding: space.sm, borderRadius: radius.card, gap: space.xs },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  grow: { flex: 1 },
});
