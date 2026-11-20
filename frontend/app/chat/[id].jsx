/**
 * Conversation: top bar (back, picture, name, and "online" / "last seen" /
 * "typing…"; tap for contact or group info; search), the thread, and the
 * message bar docked above the keyboard. Long-press a message for
 * reactions, reply, forward, star, edit and delete.
 */
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import MessageCircle from 'lucide-react-native/icons/message-circle';
import Search from 'lucide-react-native/icons/search';
import TimerIcon from 'lucide-react-native/icons/timer';
import WifiOff from 'lucide-react-native/icons/wifi-off';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { friendlyMessage } from '../../src/api/ApiError';
import * as social from '../../src/api/social';
import { notifyFailed, notifyPhotoDone, notifyPhotoStarted } from '../../src/alerts/notify';
import { dismissAlert, showToast } from '../../src/alerts/alertStore';
import { Avatar } from '../../src/components/avatar/Avatar';
import { GroupAvatar } from '../../src/components/avatar/GroupAvatar';
import { ImageBubble } from '../../src/components/chat/ImageBubble';
import { MessageActions } from '../../src/components/chat/MessageActions';
import { MessageBar } from '../../src/components/chat/MessageBar';
import { SearchSheet } from '../../src/components/chat/SearchSheet';
import { Thread } from '../../src/components/chat/Thread';
import { TypingBubble } from '../../src/components/chat/TypingBubble';
import { EmptyState } from '../../src/components/kit/EmptyState';
import { IconButton } from '../../src/components/kit/IconButton';
import { KeyboardSpacer } from '../../src/components/kit/KeyboardSpacer';
import { ListSkeleton } from '../../src/components/kit/Skeleton';
import { space, type } from '../../src/constants/theme';
import { isLocal } from '../../src/hooks/messageList';
import { useMessages } from '../../src/hooks/useMessages';
import { useScreenshotAlert } from '../../src/hooks/useScreenshotAlert';
import { useStore } from '../../src/hooks/useStore';
import { useTheme } from '../../src/hooks/useTheme';
import { setOpenChat, syncOpenChat } from '../../src/inbox/inboxStore';
import { chatsStore, loadConversations } from '../../src/store/chatsStore';
import { directoryStore, loadUsers } from '../../src/store/directoryStore';
import { sessionStore } from '../../src/store/sessionStore';
import {
  blocksStore,
  featuresStore,
  peopleStore,
  prefsStore,
  reportScreenshot,
  reportTyping,
  setBlocked,
  streaksStore,
} from '../../src/store/socialStores';
import { Icon } from '../../src/components/kit/Icon';
import { conversationTitle, memberNames, otherParticipantId } from '../../src/utils/conversationTitle';
import { formatClock, formatPresence } from '../../src/utils/format';
import { log } from '../../src/utils/logger';

function showError(title, message) {
  Alert.alert(title, message);
}

export default function Conversation() {
  const { id } = useLocalSearchParams();
  const conversationId = String(id);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const myId = useStore(sessionStore, (s) => s.user?.id ?? '');
  const usersById = useStore(directoryStore, (s) => s.byId);
  const conversation = useStore(chatsStore, (s) =>
    s.conversations.find((item) => item.id === conversationId),
  );
  const features = useStore(featuresStore, (s) => s.features);
  const blockedIds = useStore(blocksStore, (s) => s.userIds);
  const typingIds = useStore(peopleStore, (s) => s.typing[conversationId] ?? []);
  const presenceById = useStore(peopleStore, (s) => s.byId);
  const clearedAt = useStore(prefsStore, (s) => s.byChat[conversationId]?.clearedAt ?? null);
  const streak = useStore(streaksStore, (s) => s.byChat[conversationId] ?? null);
  const chat = useMessages(conversationId, myId);
  const [actionsFor, setActionsFor] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [editing, setEditing] = useState(null);

  const canAct = features.includes('message-actions');
  const canSnap = features.includes('snaps');

  // Taking a screenshot of this chat tells everyone in it.
  useScreenshotAlert(() => reportScreenshot(conversationId));

  useEffect(() => {
    setOpenChat(conversationId);
    dismissAlert(`msg:${conversationId}`);
    dismissAlert(`new:${conversationId}`);
    return () => setOpenChat(null);
  }, [conversationId]);

  useEffect(() => {
    const fromServer = chat.messages.filter((message) => !isLocal(message));
    if (fromServer.length) syncOpenChat(conversationId, fromServer, myId);
  }, [chat.messages, conversationId, myId]);

  // Clearing the chat (from its info screen) reloads it.
  useEffect(() => {
    if (clearedAt) chat.loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearedAt]);

  const failedIds = chat.messages
    .filter((message) => message.localState === 'failed')
    .map((message) => message.id)
    .join(',');
  useEffect(() => {
    const ids = failedIds ? failedIds.split(',') : [];
    notifyFailed(conversationId, ids.length, () => ids.forEach((item) => chat.retry(item)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [failedIds, conversationId]);
  useEffect(() => () => notifyFailed(conversationId, 0), [conversationId]);

  useEffect(() => {
    if (!conversation) loadConversations();
    if (!Object.keys(usersById).length) loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isGroup = conversation?.type === 'GROUP';
  const title = conversation ? conversationTitle(conversation, myId, usersById) : '';
  const names = conversation ? memberNames(conversation, myId, usersById) : [];
  const otherId = conversation && !isGroup ? otherParticipantId(conversation, myId) : null;
  const isBlocked = Boolean(otherId && blockedIds.includes(otherId));
  const nameOf = (userId) => (userId === myId ? 'You' : (usersById[userId]?.name ?? 'Unknown'));

  let subtitle = isGroup ? `${names.length} members` : 'Direct message';
  if (typingIds.length) {
    subtitle = isGroup
      ? `${typingIds.map((userId) => nameOf(userId)).join(', ')} ${typingIds.length > 1 ? 'are' : 'is'} typing…`
      : 'typing…';
  } else if (!isGroup && otherId) {
    subtitle = formatPresence(presenceById[otherId]) || 'Tap for contact info';
  } else if (isGroup) {
    subtitle = `${names.length} members · tap for group info`;
  }

  function changeDraft(text) {
    setDraft(text);
    if (text) reportTyping(conversationId);
  }

  async function send() {
    const text = draft.trim();
    if (!text) return;
    if (editing) {
      const target = editing;
      setEditing(null);
      setDraft('');
      try {
        chat.replace(await social.editMessage(target.id, text));
      } catch (error) {
        showError('Message not edited', friendlyMessage(error));
      }
      return;
    }
    chat.send(text, replyTo?.message ?? null);
    setDraft('');
    setReplyTo(null);
    setSentCount((count) => count + 1);
  }

  async function sendPhoto(photo) {
    setSentCount((count) => count + 1);
    const quoted = replyTo?.message ?? null;
    setReplyTo(null);
    notifyPhotoStarted(conversationId);
    const result = await chat.sendImage(photo, quoted);
    notifyPhotoDone(result.ok);
    if (result.error) showError('Photo not sent', result.error);
  }

  async function sendFile(file) {
    setSentCount((count) => count + 1);
    const quoted = replyTo?.message ?? null;
    setReplyTo(null);
    const result = await chat.sendFile(file, quoted);
    if (result.error) showError('Not sent', result.error);
    else if (result.ok) showToast({ title: file.mimeType?.startsWith('audio/') ? 'Voice message sent' : 'Document sent' });
  }

  function openImage(message) {
    log.nav(`chat -> image/${message.fileId}`);
    router.push({
      pathname: '/image/[id]',
      params: {
        id: message.fileId,
        sender: nameOf(message.senderId),
        time: formatClock(message.createdAt),
        caption: message.content ?? '',
      },
    });
  }

  function renderAttachment(message) {
    const hasImage = message.type === 'IMAGE' && (message.fileId || message.localUri);
    return hasImage ? <ImageBubble message={message} onOpen={openImage} /> : undefined;
  }

  async function react(message, emoji) {
    const current = message.reactions?.[myId] ?? '';
    try {
      chat.replace(await social.reactToMessage(message.id, current === emoji ? '' : emoji));
    } catch (error) {
      showError('Reaction not saved', friendlyMessage(error));
    }
  }

  async function star(message, starred) {
    try {
      chat.replace(await social.starMessage(message.id, starred));
      showToast({ title: starred ? 'Starred' : 'Removed from starred', icon: 'star' });
    } catch (error) {
      showError('Not saved', friendlyMessage(error));
    }
  }

  async function remove(message, scope) {
    try {
      await social.deleteMessage(message.id, scope);
      if (scope === 'me') chat.remove(message.id);
      else chat.replace({ ...message, deleted: true, content: '', fileId: null, file: null, reactions: {} });
      showToast({ title: 'Message deleted', icon: 'trash' });
    } catch (error) {
      showError('Message not deleted', friendlyMessage(error));
    }
  }

  function openSnapMessage(message) {
    chat.replace({ ...message, openedBy: [...(message.openedBy ?? []), myId] });
    router.push({
      pathname: '/snap-view/[id]',
      params: { id: message.id, conversationId, sender: nameOf(message.senderId) },
    });
  }

  function startEdit(message) {
    setReplyTo(null);
    setEditing(message);
    setDraft(message.content ?? '');
  }

  function renderBody() {
    if (chat.status === 'loading') return <ListSkeleton rows={4} />;
    if (chat.status === 'error') {
      return (
        <EmptyState
          icon={WifiOff}
          title="Couldn't open this conversation"
          message={chat.error}
          actionLabel="Try again"
          onAction={chat.loadInitial}
        />
      );
    }
    if (!chat.messages.length) {
      return (
        <EmptyState
          icon={MessageCircle}
          title="No messages yet"
          message={isGroup ? 'Start the conversation for the group.' : `Send ${title || 'them'} the first message.`}
        />
      );
    }
    return (
      <Thread
        messages={chat.messages}
        myId={myId}
        usersById={usersById}
        isGroup={isGroup}
        hasOlder={Boolean(chat.nextCursor)}
        isLoadingOlder={chat.isLoadingOlder}
        unseen={chat.unseen}
        onLoadOlder={chat.loadOlder}
        onSeen={chat.markSeen}
        onLongPress={setActionsFor}
        onRetry={chat.retry}
        onReact={canAct ? react : undefined}
        onOpenSnap={openSnapMessage}
        header={
          typingIds.length ? (
            <TypingBubble
              name={nameOf(typingIds[0])}
              label={isGroup ? `${nameOf(typingIds[0])}${typingIds.length > 1 ? ` +${typingIds.length - 1}` : ''}` : undefined}
            />
          ) : null
        }
        renderAttachment={renderAttachment}
        scrollToBottomSignal={sentCount}
      />
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View
        style={[
          styles.topBar,
          { paddingTop: insets.top + space.xxs, backgroundColor: colors.card, borderBottomColor: colors.line },
        ]}
      >
        <IconButton icon={ChevronLeft} accessibilityLabel="Back" onPress={() => router.back()} />
        <Pressable
          style={styles.who}
          onPress={() => router.push(`/chat-info/${conversationId}`)}
          accessibilityRole="button"
          accessibilityLabel={`${title}, ${subtitle}. Open info`}
        >
          {isGroup ? <GroupAvatar names={names} size={38} /> : <Avatar name={title} size={38} />}
          <View style={styles.whoText}>
            <View style={styles.titleRow}>
              <Text style={[type.bodyStrong, styles.shrink, { color: colors.text }]} numberOfLines={1}>
                {title}
              </Text>
              {streak?.count ? (
                <Text style={[type.label, { color: colors.text }]}>
                  {streak.expiresSoon ? '⏳' : '🔥'} {streak.count}
                </Text>
              ) : null}
              {conversation?.disappearSeconds ? <Icon as={TimerIcon} color={colors.accent} size={15} /> : null}
            </View>
            <Text
              style={[type.caption, { color: typingIds.length ? colors.accent : colors.textMuted }]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          </View>
        </Pressable>
        {canAct ? (
          <IconButton icon={Search} accessibilityLabel="Search this chat" onPress={() => setIsSearchOpen(true)} />
        ) : null}
      </View>
      <View style={styles.body}>{renderBody()}</View>
      {isBlocked ? (
        <Pressable
          onPress={() => setBlocked(otherId, false).catch((error) => showError('Not unblocked', friendlyMessage(error)))}
          accessibilityRole="button"
          style={[styles.blocked, { backgroundColor: colors.card, borderTopColor: colors.line }]}
        >
          <Text style={[type.meta, { color: colors.textMuted }]}>You blocked this contact.</Text>
          <Text style={[type.label, { color: colors.accent }]}>Tap to unblock</Text>
        </Pressable>
      ) : (
        <MessageBar
          value={draft}
          onChangeText={changeDraft}
          onSend={send}
          onPhoto={sendPhoto}
          onFile={sendFile}
          onError={(message) => showError("Couldn't attach", message)}
          canExtras={canAct}
          onSnap={canSnap ? () => router.push({ pathname: '/snap', params: { to: conversationId } }) : undefined}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          editing={editing}
          onCancelEdit={() => {
            setEditing(null);
            setDraft('');
          }}
        />
      )}
      <View style={{ backgroundColor: colors.card }}>
        <KeyboardSpacer restingHeight={insets.bottom} />
      </View>
      <MessageActions
        message={actionsFor}
        isMine={actionsFor?.senderId === myId}
        myId={myId}
        usersById={usersById}
        canAct={canAct}
        onClose={() => setActionsFor(null)}
        onReply={(message) => {
          setEditing(null);
          setReplyTo({ message, senderName: nameOf(message.senderId) });
        }}
        onEdit={startEdit}
        onForward={(message) => router.push({ pathname: '/forward', params: { messageId: message.id } })}
        onReact={react}
        onStar={star}
        onDelete={remove}
      />
      <SearchSheet
        visible={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        conversationId={conversationId}
        myId={myId}
        usersById={usersById}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xxs,
    paddingHorizontal: space.xs,
    paddingBottom: space.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  who: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  whoText: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  shrink: { flexShrink: 1 },
  body: { flex: 1 },
  blocked: {
    alignItems: 'center',
    gap: 2,
    paddingVertical: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
