/**
 * Bubble: one message. Incoming ones are cards on the left; yours are cobalt
 * on the right with the time and ticks tucked inside. Inside, top to bottom:
 * "Forwarded", the quoted reply, a photo / document / voice note, the text,
 * then star, "Edited", time and ticks. Reactions hang under the bubble.
 * A deleted message shows a placeholder. A failed send turns red, shakes
 * once and retries on tap. Long-press opens the message actions.
 */
import Ban from 'lucide-react-native/icons/ban';
import CameraIcon from 'lucide-react-native/icons/camera';
import Eye from 'lucide-react-native/icons/eye';
import Forward from 'lucide-react-native/icons/forward';
import ImageIcon from 'lucide-react-native/icons/image';
import Star from 'lucide-react-native/icons/star';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Keyframe } from 'react-native-reanimated';
import { durations, EASE_OUT } from '../../constants/motion';
import { fonts, radius, shadow, space, type } from '../../constants/theme';
import { useShake } from '../../hooks/useShake';
import { useTheme } from '../../hooks/useTheme';
import { formatClock } from '../../utils/format';
import { haptics } from '../../utils/haptics';
import { isAudio } from '../../utils/media';
import { bubbleLabel, tickState } from '../../utils/ticks';
import { swatchFor } from '../avatar/avatarArt';
import { Gradient } from '../kit/Gradient';
import { Icon } from '../kit/Icon';
import { FileCard } from './FileCard';
import { Reactions } from './Reactions';
import { ReplyQuote } from './ReplyQuote';
import { Ticks } from './Ticks';
import { VoiceNote } from './VoiceNote';

const FROM_LEFT = new Keyframe({
  0: { opacity: 0, transform: [{ translateX: -14 }] },
  100: { opacity: 1, transform: [{ translateX: 0 }], easing: EASE_OUT },
}).duration(durations.messageIn);
const FROM_RIGHT = new Keyframe({
  0: { opacity: 0, transform: [{ translateX: 14 }] },
  100: { opacity: 1, transform: [{ translateX: 0 }], easing: EASE_OUT },
}).duration(durations.messageIn);

/**
 * @param {object} props
 * @param {object} props.message
 * @param {boolean} props.isMine
 * @param {string} props.myId
 * @param {string} props.senderName
 * @param {(userId: string) => string} props.nameOf
 * @param {boolean} props.showSenderName
 * @param {boolean} props.isLastInRun
 * @param {(message: object) => void} props.onLongPress
 * @param {(id: string) => void} props.onRetry
 * @param {(message: object, emoji: string) => void} [props.onReact]
 * @param {(message: object) => void} [props.onOpenSnap]
 * @param {import('react').ReactNode} [props.attachment] a photo
 */
export function Bubble({
  message,
  isMine,
  myId,
  senderName,
  nameOf,
  showSenderName,
  isLastInRun,
  onLongPress,
  onRetry,
  onReact,
  onOpenSnap,
  attachment,
}) {
  const { colors } = useTheme();
  const { animatedStyle, shake } = useShake();
  const ticks = isMine && !message.deleted ? tickState(message) : null;
  const isFailed = ticks === 'failed';
  const time = formatClock(message.createdAt);
  const file = message.file ?? null;
  const isVoice = message.type === 'FILE' && isAudio(file?.mimeType);
  const isDoc = message.type === 'FILE' && !isVoice;

  useEffect(() => {
    if (isFailed) {
      haptics.error();
      shake();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFailed]);

  const corners = isMine
    ? { borderBottomRightRadius: isLastInRun ? radius.bubble : radius.bubbleTight, borderTopRightRadius: radius.bubbleTight }
    : { borderBottomLeftRadius: isLastInRun ? radius.bubble : radius.bubbleTight, borderTopLeftRadius: radius.bubbleTight };
  const fill = isFailed
    ? { backgroundColor: colors.danger }
    : isMine
      ? { backgroundColor: colors.outgoing }
      : { backgroundColor: colors.incoming, ...shadow(1, colors.shadow) };
  const onBlue = isMine || isFailed;
  const textColor = onBlue ? colors.onOutgoing : colors.text;
  const metaColor = onBlue ? 'rgba(255,255,255,0.75)' : colors.textFaint;
  const isSnap = Boolean(message.viewOnce) && !message.deleted;
  const openedByMe = (message.openedBy ?? []).includes(myId);
  const openedByOthers = (message.openedBy ?? []).some((userId) => userId !== myId);
  const canOpenSnap = isSnap && !isMine && !openedByMe && !message.localState;
  const hasMedia = !message.deleted && !isSnap && (attachment || isDoc || isVoice);

  function handleLongPress() {
    if (message.localState) return;
    haptics.select();
    onLongPress(message);
  }

  let body = null;
  if (isSnap) {
    const label = isMine
      ? openedByOthers
        ? 'Snap opened'
        : 'Snap sent'
      : openedByMe
        ? 'Snap opened'
        : 'Tap to view snap';
    body = (
      <View style={styles.snapRow}>
        <View style={[styles.snapIcon, { backgroundColor: canOpenSnap ? 'rgba(255,255,255,0.22)' : onBlue ? 'rgba(255,255,255,0.18)' : colors.accentSoft }]}>
          <Icon as={canOpenSnap || !openedByMe ? CameraIcon : Eye} color={canOpenSnap || onBlue ? '#FFFFFF' : colors.accent} size={18} />
        </View>
        <View>
          <Text style={[type.bodyStrong, { color: canOpenSnap ? '#FFFFFF' : textColor }]}>{label}</Text>
          {message.content && canOpenSnap ? (
            <Text style={[type.caption, { color: 'rgba(255,255,255,0.8)' }]}>with a caption</Text>
          ) : null}
        </View>
      </View>
    );
  } else if (message.deleted) {
    body = (
      <View style={styles.deleted}>
        <Icon as={Ban} color={metaColor} size={15} />
        <Text style={[type.body, styles.italic, { color: metaColor }]}>
          {isMine ? 'You deleted this message' : 'This message was deleted'}
        </Text>
      </View>
    );
  } else if (message.content) {
    body = <Text style={[type.body, styles.content, { color: textColor }]}>{message.content}</Text>;
  } else if (message.type === 'IMAGE' && !attachment) {
    body = (
      <View style={styles.deleted}>
        <Icon as={ImageIcon} color={textColor} size={18} />
        <Text style={[type.body, { color: textColor }]}>Photo</Text>
      </View>
    );
  }

  return (
    <Animated.View
      entering={message.isFresh ? (isMine ? FROM_RIGHT : FROM_LEFT) : undefined}
      style={[styles.row, isMine ? styles.mine : styles.theirs, isLastInRun && styles.runEnd]}
    >
      <View style={[styles.column, isMine && styles.columnMine]}>
        {showSenderName ? (
          <Text style={[type.micro, styles.sender, { color: swatchFor(senderName).bg }]}>{senderName}</Text>
        ) : null}
        <Animated.View style={animatedStyle}>
          <Pressable
            onPress={
              isFailed ? () => onRetry(message.id) : canOpenSnap && onOpenSnap ? () => onOpenSnap(message) : undefined
            }
            onLongPress={handleLongPress}
            delayLongPress={300}
            accessibilityRole={isFailed || canOpenSnap ? 'button' : 'text'}
            accessibilityLabel={bubbleLabel({
              isMine,
              senderName,
              content: message.deleted ? 'deleted message' : isSnap ? 'snap' : message.content,
              type: message.type,
              time,
              ticks,
            })}
            accessibilityHint={isFailed ? 'Tap to send again' : 'Long press for options'}
            style={[
              styles.bubble,
              fill,
              isMine && !isFailed ? styles.clear : null,
              canOpenSnap ? styles.clear : null,
              corners,
              hasMedia ? styles.withMedia : null,
              { opacity: message.localState === 'sending' && !hasMedia ? 0.75 : 1 },
            ]}
          >
            {(isMine && !isFailed) || canOpenSnap ? (
              <Gradient kind={canOpenSnap ? 'sunset' : 'brand'} style={StyleSheet.absoluteFill} />
            ) : null}
            {message.forwarded && !message.deleted && !isSnap ? (
              <View style={[styles.forwarded, hasMedia ? styles.pad : null]}>
                <Icon as={Forward} color={metaColor} size={13} />
                <Text style={[type.caption, styles.italic, { color: metaColor }]}>Forwarded</Text>
              </View>
            ) : null}
            {message.replyTo && !message.deleted && !isSnap ? (
              <ReplyQuote
                quoted={message.replyTo}
                senderName={message.replyTo.senderId === myId ? 'You' : nameOf(message.replyTo.senderId)}
                onOutgoing={onBlue}
                colors={colors}
              />
            ) : null}
            {!message.deleted && !isSnap ? attachment : null}
            {!message.deleted && isDoc ? (
              <FileCard file={file} isMine={onBlue} colors={colors} isUploading={Boolean(message.uploadStage)} />
            ) : null}
            {!message.deleted && isVoice && message.fileId ? (
              <VoiceNote fileId={message.fileId} isMine={onBlue} colors={colors} />
            ) : null}
            {!message.deleted && isVoice && !message.fileId ? (
              <Text style={[type.meta, { color: textColor }]}>Sending voice message…</Text>
            ) : null}
            <View style={[styles.textRow, hasMedia ? styles.pad : null]}>
              {body}
              <View style={styles.meta}>
                {message.starred ? <Icon as={Star} color={metaColor} size={11} /> : null}
                {message.editedAt && !message.deleted ? (
                  <Text style={[styles.time, styles.italic, { color: metaColor }]}>Edited</Text>
                ) : null}
                <Text style={[styles.time, { color: canOpenSnap ? 'rgba(255,255,255,0.85)' : metaColor }]}>
                  {isFailed ? 'Not sent' : time}
                </Text>
                {ticks ? <Ticks state={ticks} /> : null}
              </View>
            </View>
          </Pressable>
        </Animated.View>
        {!message.deleted && !isSnap && onReact ? (
          <Reactions
            reactions={message.reactions}
            myId={myId}
            isMine={isMine}
            colors={colors}
            onToggle={(emoji) => onReact(message, emoji)}
          />
        ) : null}
        {isFailed ? (
          <Text style={[type.caption, { color: colors.danger }]}>Tap the message to send it again</Text>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', paddingHorizontal: space.md, marginTop: 3 },
  runEnd: { marginBottom: space.sm },
  mine: { justifyContent: 'flex-end' },
  theirs: { justifyContent: 'flex-start' },
  column: { maxWidth: '80%', gap: 4 },
  columnMine: { alignItems: 'flex-end' },
  sender: { marginLeft: space.xs },
  bubble: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.bubble, gap: 6, overflow: 'hidden' },
  clear: { backgroundColor: 'transparent' },
  snapRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 2 },
  snapIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  withMedia: { padding: 4 },
  pad: { paddingHorizontal: 8 },
  forwarded: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  deleted: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  italic: { fontStyle: 'italic' },
  textRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', columnGap: 8, paddingBottom: 2 },
  content: { flexShrink: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 'auto', paddingTop: 2 },
  time: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 14 },
});
