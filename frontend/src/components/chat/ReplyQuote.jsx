/**
 * ReplyQuote: the message being answered, shown inside a bubble or above the
 * message bar. A coloured edge in the sender's colour, their name, one line.
 */
import Ban from 'lucide-react-native/icons/ban';
import FileText from 'lucide-react-native/icons/file-text';
import ImageIcon from 'lucide-react-native/icons/image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { type } from '../../constants/theme';
import { swatchFor } from '../avatar/avatarArt';
import { Icon } from '../kit/Icon';

/** @param {{ content?: string, type?: string, deleted?: boolean }} quoted */
export function quoteText(quoted) {
  if (quoted.deleted) return 'This message was deleted';
  if (quoted.content) return quoted.content;
  if (quoted.type === 'IMAGE') return 'Photo';
  return 'File';
}

/**
 * @param {object} props
 * @param {{ id: string, senderId: string, content?: string, type?: string, deleted?: boolean }} props.quoted
 * @param {string} props.senderName
 * @param {boolean} [props.onOutgoing] inside one of your own (cobalt) bubbles
 * @param {object} props.colors
 * @param {() => void} [props.onPress]
 */
export function ReplyQuote({ quoted, senderName, onOutgoing = false, colors, onPress }) {
  const edge = onOutgoing ? 'rgba(255,255,255,0.85)' : swatchFor(senderName).bg;
  const bg = onOutgoing ? 'rgba(255,255,255,0.16)' : colors.bgSunken;
  const nameColor = onOutgoing ? '#FFFFFF' : edge;
  const textColor = onOutgoing ? 'rgba(255,255,255,0.85)' : colors.textMuted;
  const icon = quoted.deleted ? Ban : quoted.type === 'IMAGE' ? ImageIcon : quoted.type === 'FILE' ? FileText : null;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[styles.box, { backgroundColor: bg, borderLeftColor: edge }]}
      accessibilityLabel={`Reply to ${senderName}: ${quoteText(quoted)}`}
    >
      <Text style={[type.micro, { color: nameColor }]} numberOfLines={1}>
        {senderName}
      </Text>
      <View style={styles.line}>
        {icon ? <Icon as={icon} color={textColor} size={13} /> : null}
        <Text style={[type.meta, styles.text, { color: textColor }]} numberOfLines={2}>
          {quoteText(quoted)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: { borderLeftWidth: 3, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, gap: 2 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  text: { flexShrink: 1 },
});
