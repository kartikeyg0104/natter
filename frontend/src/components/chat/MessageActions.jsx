/**
 * MessageActions: long-press a message and this sheet slides up with a
 * preview, a row of quick reactions, then Reply, Copy, Forward, Star,
 * Edit (your own text, first 15 minutes), Delete and Info (sent time and
 * who has read it). On a basic server only Copy and Info are offered.
 */
import Copy from 'lucide-react-native/icons/copy';
import Forward from 'lucide-react-native/icons/forward';
import Info from 'lucide-react-native/icons/info';
import Pencil from 'lucide-react-native/icons/pencil';
import Reply from 'lucide-react-native/icons/reply';
import Star from 'lucide-react-native/icons/star';
import StarOff from 'lucide-react-native/icons/star-off';
import Trash2 from 'lucide-react-native/icons/trash-2';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { notifyCopied } from '../../alerts/notify';
import { radius, space, type } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { formatDateTime } from '../../utils/format';
import { haptics } from '../../utils/haptics';
import { log } from '../../utils/logger';
import { receiptRows } from '../../utils/ticks';
import { Icon } from '../kit/Icon';
import { ListRow } from '../kit/ListRow';
import { Sheet } from '../kit/Sheet';
import { quoteText } from './ReplyQuote';

export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const EDIT_WINDOW_MS = 15 * 60 * 1000;
const RECEIPT_STATE = { read: 'Read', delivered: 'Delivered', sent: 'Sent' };

/** Your own text messages can be edited for 15 minutes after sending. */
function isEditable(message) {
  return Boolean(message.content) && Date.now() - Date.parse(message.createdAt) < EDIT_WINDOW_MS;
}

/**
 * @param {object} props
 * @param {object | null} props.message null hides the sheet
 * @param {boolean} props.isMine
 * @param {string} props.myId
 * @param {Record<string, { name: string }>} props.usersById
 * @param {boolean} props.canAct the server supports message actions
 * @param {() => void} props.onClose
 * @param {(message: object) => void} props.onReply
 * @param {(message: object) => void} props.onEdit
 * @param {(message: object) => void} props.onForward
 * @param {(message: object, emoji: string) => void} props.onReact
 * @param {(message: object, starred: boolean) => void} props.onStar
 * @param {(message: object, scope: 'me' | 'everyone') => void} props.onDelete
 */
export function MessageActions({
  message,
  isMine,
  myId,
  usersById,
  canAct,
  onClose,
  onReply,
  onEdit,
  onForward,
  onReact,
  onStar,
  onDelete,
}) {
  const { colors } = useTheme();
  const [mode, setMode] = useState('menu'); // menu | info | delete

  function close() {
    setMode('menu');
    onClose();
  }

  function run(action) {
    const target = message;
    close();
    action(target);
  }

  async function copy() {
    await Clipboard.setStringAsync(message?.content ?? '');
    haptics.success();
    notifyCopied();
    log.app('message copied');
    close();
  }

  if (!message) return <Sheet visible={false} onClose={close}>{null}</Sheet>;

  const sender = isMine ? 'You' : (usersById[message.senderId]?.name ?? 'Unknown');
  const receipts = receiptRows(message, usersById);
  const myReaction = message.reactions?.[myId] ?? '';
  const isDeleted = Boolean(message.deleted);
  const canEdit = canAct && isMine && !isDeleted && isEditable(message);
  const row = (title, icon, onPress, tone = 'default') => (
    <ListRow
      key={title}
      title={title}
      onPress={onPress}
      tone={tone}
      leading={<Icon as={icon} color={tone === 'danger' ? colors.danger : colors.accent} size={20} />}
      trailing={<View />}
    />
  );

  return (
    <Sheet visible onClose={close}>
      <View style={styles.body}>
        <View style={[styles.preview, { backgroundColor: colors.bg }]}>
          <Text style={[type.micro, { color: colors.textMuted }]}>{sender}</Text>
          <Text style={[type.body, { color: colors.text }]} numberOfLines={3}>
            {quoteText(message)}
          </Text>
        </View>

        {canAct && !isDeleted && mode === 'menu' ? (
          <View style={[styles.reactions, { backgroundColor: colors.bg }]} accessibilityRole="toolbar">
            {QUICK_REACTIONS.map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() => {
                  haptics.tap();
                  run((target) => onReact(target, myReaction === emoji ? '' : emoji));
                }}
                accessibilityRole="button"
                accessibilityLabel={myReaction === emoji ? `Remove ${emoji}` : `React ${emoji}`}
                style={[styles.reaction, myReaction === emoji ? { backgroundColor: colors.accentSoft } : null]}
              >
                <Text style={styles.reactionText}>{emoji}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {mode === 'menu' ? (
          <View style={[styles.actions, { backgroundColor: colors.bg }]}>
            {canAct && !isDeleted ? row('Reply', Reply, () => run(onReply)) : null}
            {message.content && !isDeleted ? row('Copy text', Copy, copy) : null}
            {canAct && !isDeleted ? row('Forward', Forward, () => run(onForward)) : null}
            {canAct && !isDeleted
              ? row(message.starred ? 'Unstar' : 'Star', message.starred ? StarOff : Star, () =>
                  run((target) => onStar(target, !target.starred)),
                )
              : null}
            {canEdit ? row('Edit', Pencil, () => run(onEdit)) : null}
            {row('Info', Info, () => setMode('info'))}
            {canAct ? row('Delete', Trash2, () => setMode('delete'), 'danger') : null}
          </View>
        ) : null}

        {mode === 'delete' ? (
          <View style={styles.deleteBox}>
            <Text style={[type.heading, { color: colors.text }]}>Delete message?</Text>
            <View style={[styles.actions, { backgroundColor: colors.bg }]}>
              {isMine && !isDeleted
                ? row('Delete for everyone', Trash2, () => run((target) => onDelete(target, 'everyone')), 'danger')
                : null}
              {row('Delete for me', Trash2, () => run((target) => onDelete(target, 'me')), 'danger')}
              {row('Cancel', Info, () => setMode('menu'))}
            </View>
          </View>
        ) : null}

        {mode === 'info' ? (
          <ScrollView style={styles.info} contentContainerStyle={styles.infoContent}>
            <Text style={[type.meta, { color: colors.textMuted }]}>Sent {formatDateTime(message.createdAt)}</Text>
            {message.editedAt ? (
              <Text style={[type.meta, { color: colors.textMuted }]}>Edited {formatDateTime(message.editedAt)}</Text>
            ) : null}
            {receipts.length ? (
              receipts.map((item) => (
                <View key={item.id} style={styles.receipt}>
                  <Text style={[type.body, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[type.meta, { color: item.state === 'read' ? colors.accent : colors.textMuted }]}>
                    {RECEIPT_STATE[item.state]}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={[type.caption, { color: colors.textFaint }]}>No read receipts from this server.</Text>
            )}
            <Text style={[type.caption, { color: colors.textFaint }]} selectable>
              ID {message.id}
            </Text>
          </ScrollView>
        ) : null}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.sm },
  preview: { padding: space.sm, borderRadius: radius.field, gap: 4 },
  reactions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 6,
    borderRadius: radius.field,
  },
  reaction: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  reactionText: { fontSize: 24 },
  actions: { borderRadius: radius.field, overflow: 'hidden' },
  deleteBox: { gap: space.sm },
  info: { maxHeight: 260 },
  infoContent: { gap: 6, paddingHorizontal: space.xxs },
  receipt: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
});
