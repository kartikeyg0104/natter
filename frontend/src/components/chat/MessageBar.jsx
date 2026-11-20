/**
 * MessageBar: the docked bar under a conversation.
 * - a "+" that opens Photo / Camera / Document
 * - a growing text field
 * - send when there is text; otherwise a microphone that records a voice
 *   note (tap to start, then send or cancel)
 * Above it, when set: the message you're replying to, or the one you're
 * editing, each with a close button. Sends "typing…" as you write.
 */
import Aperture from 'lucide-react-native/icons/aperture';
import ArrowUp from 'lucide-react-native/icons/arrow-up';
import Camera from 'lucide-react-native/icons/camera';
import Check from 'lucide-react-native/icons/check';
import FileText from 'lucide-react-native/icons/file-text';
import ImageIcon from 'lucide-react-native/icons/image';
import Mic from 'lucide-react-native/icons/mic';
import Pencil from 'lucide-react-native/icons/pencil';
import Plus from 'lucide-react-native/icons/plus';
import Trash2 from 'lucide-react-native/icons/trash-2';
import X from 'lucide-react-native/icons/x';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { fonts, space, type } from '../../constants/theme';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import { useTheme } from '../../hooks/useTheme';
import { haptics } from '../../utils/haptics';
import { log } from '../../utils/logger';
import { pickDocument, takePhoto } from '../../utils/media';
import { pickPhoto } from '../../utils/pickPhoto';
import { Gradient } from '../kit/Gradient';
import { Icon } from '../kit/Icon';
import { PressableScale } from '../kit/PressableScale';
import { ReplyQuote } from './ReplyQuote';

const MAX_INPUT_HEIGHT = 120;
const MAX_LENGTH = 4000;

function clock(seconds) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/**
 * @param {object} props
 * @param {string} props.value
 * @param {(text: string) => void} props.onChangeText
 * @param {() => void} props.onSend
 * @param {(photo: object) => void} props.onPhoto
 * @param {(file: object) => void} props.onFile document or voice note
 * @param {(message: string) => void} props.onError
 * @param {boolean} props.canExtras documents, voice notes, replies (Natter server)
 * @param {{ message: object, senderName: string } | null} [props.replyTo]
 * @param {() => void} [props.onCancelReply]
 * @param {object | null} [props.editing]
 * @param {() => void} [props.onCancelEdit]
 * @param {() => void} [props.onSnap] opens the snap camera for this chat
 */
export function MessageBar({
  value,
  onChangeText,
  onSend,
  onPhoto,
  onFile,
  onError,
  canExtras,
  replyTo,
  onCancelReply,
  editing,
  onCancelEdit,
  onSnap,
}) {
  const { colors } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [busy, setBusy] = useState(null); // 'photo' | 'camera' | 'document' | 'voice'
  const voice = useVoiceRecorder();
  const hasText = value.trim().length > 0;

  async function choose(kind) {
    setIsMenuOpen(false);
    setBusy(kind);
    try {
      if (kind === 'photo') {
        const photo = await pickPhoto();
        if (photo) onPhoto(photo);
      } else if (kind === 'camera') {
        const photo = await takePhoto();
        if (photo) onPhoto(photo);
      } else {
        const file = await pickDocument();
        if (file) onFile(file);
      }
    } catch (error) {
      log.warn(`${kind} picker failed: ${error?.message ?? error}`);
      onError(error?.message ?? "Couldn't open that file.");
    } finally {
      setBusy(null);
    }
  }

  async function startVoice() {
    try {
      haptics.select();
      await voice.start();
    } catch (error) {
      onError(error?.message ?? "Couldn't start recording.");
    }
  }

  async function sendVoice() {
    setBusy('voice');
    try {
      const note = await voice.stop();
      if (note.seconds < 1) return;
      onFile({ ...note, size: Math.round((note.data.length * 3) / 4) });
    } catch (error) {
      onError(error?.message ?? "Couldn't send the voice message.");
    } finally {
      setBusy(null);
    }
  }

  const option = (kind, icon, label) => (
    <Pressable
      key={kind}
      onPress={() => choose(kind)}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.option}
    >
      <View style={[styles.optionTile, { backgroundColor: colors.accentSoft }]}>
        <Icon as={icon} color={colors.accent} size={22} />
      </View>
      <Text style={[type.caption, { color: colors.textMuted }]}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={[styles.wrap, { backgroundColor: colors.card, borderTopColor: colors.line }]}>
      {replyTo && !editing ? (
        <View style={styles.context}>
          <View style={styles.grow}>
            <ReplyQuote quoted={replyTo.message} senderName={replyTo.senderName} colors={colors} />
          </View>
          <Pressable onPress={onCancelReply} hitSlop={10} accessibilityRole="button" accessibilityLabel="Cancel reply">
            <Icon as={X} color={colors.textFaint} size={20} />
          </Pressable>
        </View>
      ) : null}
      {editing ? (
        <View style={[styles.context, styles.editRow]}>
          <Icon as={Pencil} color={colors.accent} size={16} />
          <View style={styles.grow}>
            <Text style={[type.micro, { color: colors.accent }]}>Editing message</Text>
            <Text style={[type.meta, { color: colors.textMuted }]} numberOfLines={1}>
              {editing.content}
            </Text>
          </View>
          <Pressable onPress={onCancelEdit} hitSlop={10} accessibilityRole="button" accessibilityLabel="Cancel editing">
            <Icon as={X} color={colors.textFaint} size={20} />
          </Pressable>
        </View>
      ) : null}
      {isMenuOpen ? (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.menu}>
          {onSnap ? (
            <Pressable
              onPress={() => {
                setIsMenuOpen(false);
                onSnap();
              }}
              accessibilityRole="button"
              accessibilityLabel="Snap"
              style={styles.option}
            >
              <Gradient kind="sunset" style={styles.optionTile}>
                <Icon as={Aperture} color="#FFFFFF" size={22} />
              </Gradient>
              <Text style={[type.caption, { color: colors.textMuted }]}>Snap</Text>
            </Pressable>
          ) : null}
          {option('photo', ImageIcon, 'Photo')}
          {option('camera', Camera, 'Camera')}
          {canExtras ? option('document', FileText, 'Document') : null}
        </Animated.View>
      ) : null}

      {voice.isRecording ? (
        <View style={styles.bar}>
          <Pressable
            onPress={voice.cancel}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Discard recording"
            style={styles.side}
          >
            <Icon as={Trash2} color={colors.danger} size={22} />
          </Pressable>
          <View style={[styles.recording, { backgroundColor: colors.bg, borderColor: colors.line }]}>
            <View style={[styles.dot, { backgroundColor: colors.danger }]} />
            <Text style={[type.bodyStrong, { color: colors.text }]}>{clock(voice.seconds)}</Text>
            <Text style={[type.meta, { color: colors.textMuted }]}>Recording…</Text>
          </View>
          <PressableScale onPress={sendVoice} accessibilityLabel="Send voice message">
            <View style={[styles.send, { backgroundColor: colors.accent }]}>
              <Icon as={ArrowUp} color={colors.onAccent} size={20} />
            </View>
          </PressableScale>
        </View>
      ) : (
        <View style={styles.bar}>
          {editing ? (
            <View style={styles.side} />
          ) : (
            <Pressable
              onPress={() => setIsMenuOpen((open) => !open)}
              disabled={Boolean(busy)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={isMenuOpen ? 'Close attachments' : 'Attach'}
              style={styles.side}
            >
              {busy && busy !== 'voice' ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Icon as={isMenuOpen ? X : Plus} color={colors.accent} size={24} />
              )}
            </Pressable>
          )}
          <View style={[styles.field, { backgroundColor: colors.bg, borderColor: colors.line }]}>
            <TextInput
              value={value}
              onChangeText={onChangeText}
              placeholder={editing ? 'Edit your message' : 'Write a message'}
              placeholderTextColor={colors.textFaint}
              style={[styles.input, { color: colors.text }]}
              selectionColor={colors.accent}
              multiline
              maxLength={MAX_LENGTH}
              accessibilityLabel="Message"
            />
          </View>
          {hasText || !canExtras || editing ? (
            <PressableScale onPress={onSend} disabled={!hasText} accessibilityLabel={editing ? 'Save edit' : 'Send'}>
              <View style={[styles.send, { backgroundColor: hasText ? colors.accent : colors.bgSunken }]}>
                <Icon as={editing ? Check : ArrowUp} color={hasText ? colors.onAccent : colors.textFaint} size={20} />
              </View>
            </PressableScale>
          ) : (
            <PressableScale onPress={startVoice} disabled={busy === 'voice'} accessibilityLabel="Record voice message">
              <View style={[styles.send, { backgroundColor: colors.accentSoft }]}>
                {busy === 'voice' ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <Icon as={Mic} color={colors.accent} size={20} />
                )}
              </View>
            </PressableScale>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.xs },
  context: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingBottom: space.xs,
  },
  editRow: { paddingVertical: 4 },
  grow: { flex: 1 },
  menu: { flexDirection: 'row', gap: space.lg, paddingHorizontal: space.lg, paddingBottom: space.sm },
  option: { alignItems: 'center', gap: 4 },
  optionTile: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.xs,
    paddingHorizontal: space.sm,
    paddingBottom: space.xs,
  },
  side: { width: 40, height: 42, alignItems: 'center', justifyContent: 'center' },
  field: { flex: 1, minHeight: 44, borderRadius: 22, borderWidth: 1, justifyContent: 'center' },
  input: {
    fontFamily: fonts.regular,
    fontSize: 16,
    maxHeight: MAX_INPUT_HEIGHT,
    paddingHorizontal: space.sm,
    paddingTop: 10,
    paddingBottom: 10,
  },
  recording: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.sm,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
