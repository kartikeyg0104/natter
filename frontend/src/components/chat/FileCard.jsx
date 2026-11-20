/**
 * FileCard: a document inside a message. Icon, file name, size and type;
 * tap downloads it and opens the system share / open-with sheet.
 */
import FileText from 'lucide-react-native/icons/file-text';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { type } from '../../constants/theme';
import { formatBytes } from '../../utils/fileData';
import { log } from '../../utils/logger';
import { openFile } from '../../utils/media';
import { Icon } from '../kit/Icon';

function extension(name, mimeType) {
  const fromName = (name ?? '').split('.').pop();
  if (fromName && fromName !== name) return fromName.toUpperCase().slice(0, 5);
  return (mimeType?.split('/')[1] ?? 'FILE').toUpperCase().slice(0, 5);
}

/**
 * @param {object} props
 * @param {{ id?: string, name?: string, mimeType?: string, size?: number }} props.file
 * @param {boolean} props.isMine
 * @param {object} props.colors
 * @param {boolean} [props.isUploading]
 */
export function FileCard({ file, isMine, colors, isUploading }) {
  const [isOpening, setIsOpening] = useState(false);
  const fg = isMine ? colors.onOutgoing : colors.text;
  const muted = isMine ? 'rgba(255,255,255,0.75)' : colors.textMuted;
  const tile = isMine ? 'rgba(255,255,255,0.18)' : colors.accentSoft;

  async function open() {
    if (!file?.id || isOpening) return;
    setIsOpening(true);
    try {
      await openFile(file);
    } catch (error) {
      log.warn(`open file failed: ${error?.message ?? error}`);
      Alert.alert("Couldn't open the file", error?.message ?? 'Try again.');
    } finally {
      setIsOpening(false);
    }
  }

  return (
    <Pressable
      onPress={open}
      disabled={!file?.id || isUploading}
      accessibilityRole="button"
      accessibilityLabel={`Document ${file?.name ?? ''}, tap to open`}
      style={[styles.card, { backgroundColor: isMine ? 'rgba(0,0,0,0.12)' : colors.bg }]}
    >
      <View style={[styles.tile, { backgroundColor: tile }]}>
        {isOpening || isUploading ? (
          <ActivityIndicator size="small" color={isMine ? '#FFFFFF' : colors.accent} />
        ) : (
          <Icon as={FileText} color={isMine ? '#FFFFFF' : colors.accent} size={22} />
        )}
      </View>
      <View style={styles.text}>
        <Text style={[type.label, { color: fg }]} numberOfLines={2}>
          {file?.name ?? 'Document'}
        </Text>
        <Text style={[type.caption, { color: muted }]}>
          {[extension(file?.name, file?.mimeType), file?.size ? formatBytes(file.size) : null]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 12, minWidth: 220 },
  tile: { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
});
