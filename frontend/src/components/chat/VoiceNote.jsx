/**
 * VoiceNote: play / pause, a progress track and the time, for an audio
 * message. Streams from the server with your auth header; nothing is
 * downloaded until you press play.
 */
import Pause from 'lucide-react-native/icons/pause';
import Play from 'lucide-react-native/icons/play';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { type } from '../../constants/theme';
import { fileUrl } from '../../utils/media';
import { Icon } from '../kit/Icon';

function clock(seconds) {
  const total = Math.max(0, Math.round(seconds || 0));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * @param {object} props
 * @param {string} props.fileId
 * @param {boolean} props.isMine
 * @param {object} props.colors
 */
export function VoiceNote({ fileId, isMine, colors }) {
  const player = useAudioPlayer(fileId ? fileUrl(fileId) : null);
  const status = useAudioPlayerStatus(player);
  const fg = isMine ? '#FFFFFF' : colors.accent;
  const track = isMine ? 'rgba(255,255,255,0.3)' : colors.line;
  const duration = status.duration || 0;
  const progress = duration ? Math.min(1, status.currentTime / duration) : 0;
  const isPlaying = status.playing;

  function toggle() {
    if (isPlaying) {
      player.pause();
      return;
    }
    if (status.didJustFinish || (duration && status.currentTime >= duration - 0.05)) player.seekTo(0);
    player.play();
  }

  return (
    <View style={styles.row}>
      <Pressable
        onPress={toggle}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? 'Pause voice message' : 'Play voice message'}
        style={[styles.button, { backgroundColor: isMine ? 'rgba(255,255,255,0.2)' : colors.accentSoft }]}
      >
        <Icon as={isPlaying ? Pause : Play} color={fg} size={18} />
      </Pressable>
      <View style={styles.middle}>
        <View style={[styles.track, { backgroundColor: track }]}>
          <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: fg }]} />
        </View>
        <Text style={[type.caption, { color: isMine ? 'rgba(255,255,255,0.8)' : colors.textMuted }]}>
          {isPlaying || status.currentTime ? clock(status.currentTime) : duration ? clock(duration) : 'Voice message'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 210, paddingVertical: 2 },
  button: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  middle: { flex: 1, gap: 4 },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
});
