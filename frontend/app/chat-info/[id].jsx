/**
 * Chat info: who this conversation is with and what you can do with it.
 * - a person: picture, name, number (when saved), about, last seen;
 *   save or edit the contact, block or unblock
 * - a group: name (rename), members with presence, add members, leave
 * - both: mute, pin, archive, starred messages, clear chat
 */
import { formatPhone } from '../../src/utils/phone';
import Archive from 'lucide-react-native/icons/archive';
import Ban from 'lucide-react-native/icons/ban';
import Bell from 'lucide-react-native/icons/bell';
import BellOff from 'lucide-react-native/icons/bell-off';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import Eraser from 'lucide-react-native/icons/eraser';
import LogOut from 'lucide-react-native/icons/log-out';
import Pencil from 'lucide-react-native/icons/pencil';
import Pin from 'lucide-react-native/icons/pin';
import Star from 'lucide-react-native/icons/star';
import TimerIcon from 'lucide-react-native/icons/timer';
import UserPlus from 'lucide-react-native/icons/user-plus';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { friendlyMessage } from '../../src/api/ApiError';
import { leaveGroup, renameGroup, setDisappearing } from '../../src/api/social';
import { showToast } from '../../src/alerts/alertStore';
import { Avatar } from '../../src/components/avatar/Avatar';
import { GroupAvatar } from '../../src/components/avatar/GroupAvatar';
import { Button } from '../../src/components/kit/Button';
import { Group } from '../../src/components/kit/Group';
import { Icon } from '../../src/components/kit/Icon';
import { IconButton } from '../../src/components/kit/IconButton';
import { ListRow } from '../../src/components/kit/ListRow';
import { Sheet } from '../../src/components/kit/Sheet';
import { TextField } from '../../src/components/kit/TextField';
import { Toggle } from '../../src/components/kit/Toggle';
import { radius, space, type } from '../../src/constants/theme';
import { useStore } from '../../src/hooks/useStore';
import { useTheme } from '../../src/hooks/useTheme';
import { chatsStore, loadConversations } from '../../src/store/chatsStore';
import { directoryStore } from '../../src/store/directoryStore';
import { sessionStore } from '../../src/store/sessionStore';
import {
  blocksStore,
  contactsStore,
  featuresStore,
  isMuted,
  peopleStore,
  prefsStore,
  setBlocked,
  updatePref,
} from '../../src/store/socialStores';
import { conversationTitle, memberNames, otherParticipantId } from '../../src/utils/conversationTitle';
import { formatDateTime, formatPresence } from '../../src/utils/format';
import { confirmAction } from '../../src/utils/confirm';
import { haptics } from '../../src/utils/haptics';

const DISAPPEAR_CHOICES = [
  { label: 'Off', seconds: 0 },
  { label: '24 hours', seconds: 86400 },
  { label: '7 days', seconds: 604800 },
];

const MUTE_CHOICES = [
  { label: '8 hours', ms: 8 * 3600 * 1000 },
  { label: '1 week', ms: 7 * 24 * 3600 * 1000 },
  { label: 'Always', ms: 50 * 365 * 24 * 3600 * 1000 },
];

function Lead({ icon, color, bg }) {
  return (
    <View style={[styles.lead, { backgroundColor: bg }]}>
      <Icon as={icon} color={color} size={18} />
    </View>
  );
}

export default function ChatInfo() {
  const { id } = useLocalSearchParams();
  const conversationId = String(id);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const myId = useStore(sessionStore, (s) => s.user?.id ?? '');
  const usersById = useStore(directoryStore, (s) => s.byId);
  const conversation = useStore(chatsStore, (s) => s.conversations.find((item) => item.id === conversationId));
  const features = useStore(featuresStore, (s) => s.features);
  const pref = useStore(prefsStore, (s) => s.byChat[conversationId]);
  const blockedIds = useStore(blocksStore, (s) => s.userIds);
  const contacts = useStore(contactsStore, (s) => s.contacts);
  const presence = useStore(peopleStore, (s) => s.byId);
  const [isMuteOpen, setIsMuteOpen] = useState(false);
  const [isDisappearOpen, setIsDisappearOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [renameError, setRenameError] = useState('');

  if (!conversation) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg, paddingTop: insets.top + space.md }]}>
        <IconButton icon={ChevronLeft} accessibilityLabel="Back" onPress={() => router.back()} />
      </View>
    );
  }

  const isGroup = conversation.type === 'GROUP';
  const title = conversationTitle(conversation, myId, usersById);
  const names = memberNames(conversation, myId, usersById);
  const otherId = isGroup ? null : otherParticipantId(conversation, myId);
  const other = otherId ? usersById[otherId] : null;
  const contact = otherId ? contacts.find((item) => item.userId === otherId) : null;
  const isBlocked = Boolean(otherId && blockedIds.includes(otherId));
  const muted = isMuted(pref);
  const has = (feature) => features.includes(feature);

  async function run(action, done) {
    try {
      await action();
      if (done) showToast({ title: done });
    } catch (error) {
      Alert.alert('Something went wrong', friendlyMessage(error));
    }
  }

  function disappear(seconds) {
    setIsDisappearOpen(false);
    run(async () => {
      await setDisappearing(conversationId, seconds);
      await loadConversations();
    }, seconds ? 'Disappearing messages on' : 'Disappearing messages off');
  }

  function mute(ms) {
    setIsMuteOpen(false);
    run(
      () => updatePref(conversationId, { muted_until: new Date(Date.now() + ms).toISOString() }),
      'Notifications muted',
    );
  }

  const confirm = confirmAction;

  async function rename() {
    const trimmed = newName.trim();
    if (!trimmed) {
      setRenameError('Give the group a name.');
      return;
    }
    try {
      await renameGroup(conversationId, trimmed);
      await loadConversations();
      setIsRenameOpen(false);
      haptics.success();
      showToast({ title: 'Group renamed', detail: trimmed });
    } catch (error) {
      setRenameError(friendlyMessage(error));
    }
  }

  const members = conversation.participants_ids
    .map((userId) => ({ id: userId, user: usersById[userId] }))
    .sort((a, b) => (a.id === myId ? 1 : b.id === myId ? -1 : (a.user?.name ?? '').localeCompare(b.user?.name ?? '')));

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={[styles.topBar, { paddingTop: insets.top + space.xxs }]}>
        <IconButton icon={ChevronLeft} accessibilityLabel="Back" onPress={() => router.back()} />
        <Text style={[type.heading, { color: colors.text }]}>{isGroup ? 'Group info' : 'Contact info'}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.hero, { backgroundColor: colors.card }]}>
          {isGroup ? <GroupAvatar names={names} size={96} /> : <Avatar name={title} size={96} />}
          <Text style={[type.title, styles.center, { color: colors.text }]}>{title}</Text>
          {isGroup ? (
            <Text style={[type.meta, { color: colors.textMuted }]}>
              Group · {names.length} members · created {formatDateTime(conversation.createdAt)}
            </Text>
          ) : (
            <>
              {contact ? <Text style={[type.body, { color: colors.textMuted }]}>{formatPhone(contact.phoneNumber)}</Text> : null}
              {other?.isSaved ? (
                <Text style={[type.caption, { color: colors.textFaint }]}>~{other.username}</Text>
              ) : null}
              {formatPresence(presence[otherId]) ? (
                <Text style={[type.meta, { color: presence[otherId]?.online ? colors.success : colors.textMuted }]}>
                  {formatPresence(presence[otherId])}
                </Text>
              ) : null}
            </>
          )}
        </View>

        {!isGroup && other?.about ? (
          <Group title="About">
            <ListRow title={other.about} />
          </Group>
        ) : null}

        {!isGroup && has('contacts') ? (
          <Group>
            <ListRow
              title={contact ? 'Edit contact' : 'Add to contacts'}
              subtitle={contact ? `Saved as ${contact.name}` : 'Save their number under a name'}
              onPress={() =>
                router.push({
                  pathname: '/contact-edit',
                  params: contact
                    ? { id: contact.id, name: contact.name, phone: contact.phoneNumber }
                    : { name: other?.username ?? '' },
                })
              }
              leading={<Lead icon={contact ? Pencil : UserPlus} color={colors.accent} bg={colors.accentSoft} />}
            />
          </Group>
        ) : null}

        {has('chat-prefs') ? (
          <Group title="Chat">
            <ListRow
              title={muted ? 'Muted' : 'Mute notifications'}
              subtitle={muted ? 'Tap to turn notifications back on' : 'Stop banners for this chat'}
              onPress={() =>
                muted
                  ? run(() => updatePref(conversationId, { muted_until: null }), 'Notifications on')
                  : setIsMuteOpen(true)
              }
              leading={<Lead icon={muted ? BellOff : Bell} color={colors.accent} bg={colors.accentSoft} />}
            />
            <ListRow
              title="Pin to top of Inbox"
              leading={<Lead icon={Pin} color={colors.accent} bg={colors.accentSoft} />}
              trailing={
                <Toggle
                  value={Boolean(pref?.pinned)}
                  onChange={(pinned) => run(() => updatePref(conversationId, { pinned }))}
                  accessibilityLabel="Pin chat"
                />
              }
            />
            <ListRow
              title="Archive"
              subtitle="Hide from the Inbox until a new message arrives"
              leading={<Lead icon={Archive} color={colors.accent} bg={colors.accentSoft} />}
              trailing={
                <Toggle
                  value={Boolean(pref?.archived)}
                  onChange={(archived) => run(() => updatePref(conversationId, { archived }))}
                  accessibilityLabel="Archive chat"
                />
              }
            />
            {has('disappearing') ? (
              <ListRow
                title="Disappearing messages"
                subtitle={
                  DISAPPEAR_CHOICES.find((choice) => choice.seconds === (conversation.disappearSeconds ?? 0))?.label ??
                  'Off'
                }
                onPress={() => setIsDisappearOpen(true)}
                leading={<Lead icon={TimerIcon} color={colors.accent} bg={colors.accentSoft} />}
              />
            ) : null}
            {has('message-actions') ? (
              <ListRow
                title="Starred messages"
                onPress={() => router.push({ pathname: '/starred', params: { conversationId } })}
                leading={<Lead icon={Star} color={colors.accent} bg={colors.accentSoft} />}
              />
            ) : null}
          </Group>
        ) : null}

        {isGroup ? (
          <Group title={`${members.length} members`}>
            {has('group-admin') ? (
              <ListRow
                title="Add members"
                tone="accent"
                onPress={() => router.push({ pathname: '/add-members', params: { conversationId } })}
                leading={<Lead icon={UserPlus} color={colors.accent} bg={colors.accentSoft} />}
              />
            ) : null}
            {has('group-admin') ? (
              <ListRow
                title="Rename group"
                tone="accent"
                onPress={() => {
                  setNewName(title);
                  setRenameError('');
                  setIsRenameOpen(true);
                }}
                leading={<Lead icon={Pencil} color={colors.accent} bg={colors.accentSoft} />}
              />
            ) : null}
            {members.map(({ id: memberId, user }) => (
              <ListRow
                key={memberId}
                title={memberId === myId ? 'You' : (user?.name ?? 'Unknown')}
                subtitle={memberId === myId ? undefined : formatPresence(presence[memberId]) || user?.about || undefined}
                leading={<Avatar name={user?.name ?? ''} size={36} />}
              />
            ))}
          </Group>
        ) : null}

        <Group>
          {has('chat-prefs') ? (
            <ListRow
              title="Clear chat"
              tone="danger"
              onPress={() =>
                confirm('Clear this chat?', 'Messages are removed from this phone. Others still see them.', 'Clear', () =>
                  run(() => updatePref(conversationId, { clear: true }), 'Chat cleared'),
                )
              }
              leading={<Lead icon={Eraser} color={colors.danger} bg={colors.dangerSoft} />}
            />
          ) : null}
          {!isGroup && otherId && has('blocks') ? (
            <ListRow
              title={isBlocked ? `Unblock ${title}` : `Block ${title}`}
              tone="danger"
              onPress={() =>
                isBlocked
                  ? run(() => setBlocked(otherId, false), 'Unblocked')
                  : confirm(
                      `Block ${title}?`,
                      "Blocked contacts can't send you messages or see your status updates.",
                      'Block',
                      () => run(() => setBlocked(otherId, true), 'Blocked'),
                    )
              }
              leading={<Lead icon={Ban} color={colors.danger} bg={colors.dangerSoft} />}
            />
          ) : null}
          {isGroup && has('group-admin') ? (
            <ListRow
              title="Leave group"
              tone="danger"
              onPress={() =>
                confirm(`Leave ${title}?`, "You won't get messages from this group any more.", 'Leave', () =>
                  run(async () => {
                    await leaveGroup(conversationId);
                    await loadConversations();
                    router.dismissAll();
                    router.replace('/inbox');
                  }, 'You left the group'),
                )
              }
              leading={<Lead icon={LogOut} color={colors.danger} bg={colors.dangerSoft} />}
            />
          ) : null}
        </Group>
      </ScrollView>

      <Sheet visible={isMuteOpen} onClose={() => setIsMuteOpen(false)}>
        <Text style={[type.heading, { color: colors.text }]}>Mute notifications for…</Text>
        <View style={[styles.choices, { backgroundColor: colors.bg }]}>
          {MUTE_CHOICES.map((choice) => (
            <ListRow key={choice.label} title={choice.label} onPress={() => mute(choice.ms)} trailing={<View />} />
          ))}
        </View>
      </Sheet>

      <Sheet visible={isDisappearOpen} onClose={() => setIsDisappearOpen(false)}>
        <Text style={[type.heading, { color: colors.text }]}>Disappearing messages</Text>
        <Text style={[type.meta, { color: colors.textMuted }]}>
          New messages in this chat vanish for everyone after the time you pick.
        </Text>
        <View style={[styles.choices, { backgroundColor: colors.bg }]}>
          {DISAPPEAR_CHOICES.map((choice) => (
            <ListRow
              key={choice.label}
              title={choice.label}
              onPress={() => disappear(choice.seconds)}
              trailing={
                (conversation.disappearSeconds ?? 0) === choice.seconds ? (
                  <Icon as={TimerIcon} color={colors.accent} size={18} />
                ) : (
                  <View />
                )
              }
            />
          ))}
        </View>
      </Sheet>

      <Sheet visible={isRenameOpen} onClose={() => setIsRenameOpen(false)}>
        <Text style={[type.heading, { color: colors.text }]}>Rename group</Text>
        <TextField
          value={newName}
          onChangeText={setNewName}
          placeholder="Group name"
          icon={Pencil}
          error={renameError}
          inputProps={{ maxLength: 60, autoFocus: true }}
        />
        <Button label="Save" onPress={rename} />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.xs, paddingBottom: space.xs },
  content: { padding: space.md, gap: space.lg, paddingBottom: space.xxxl },
  hero: { alignItems: 'center', gap: space.xs, padding: space.lg, borderRadius: radius.card },
  center: { textAlign: 'center' },
  lead: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  choices: { borderRadius: radius.field, overflow: 'hidden' },
});
