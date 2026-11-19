/**
 * ChatActions: long-press a conversation in the Inbox for Pin, Mute,
 * Archive, Mark as read and Info.
 */
import Archive from 'lucide-react-native/icons/archive';
import ArchiveRestore from 'lucide-react-native/icons/archive-restore';
import Bell from 'lucide-react-native/icons/bell';
import BellOff from 'lucide-react-native/icons/bell-off';
import CheckCheck from 'lucide-react-native/icons/check-check';
import Info from 'lucide-react-native/icons/info';
import Pin from 'lucide-react-native/icons/pin';
import PinOff from 'lucide-react-native/icons/pin-off';
import { router } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { friendlyMessage } from '../../api/ApiError';
import { showToast } from '../../alerts/alertStore';
import { radius, type } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { markChatRead } from '../../inbox/inboxStore';
import { updatePref } from '../../store/socialStores';
import { Icon } from '../kit/Icon';
import { ListRow } from '../kit/ListRow';
import { Sheet } from '../kit/Sheet';

const EIGHT_HOURS = 8 * 3600 * 1000;
const eightHoursFromNow = () => new Date(Date.now() + EIGHT_HOURS).toISOString();

/** @param {{ row: object | null, onClose: () => void }} props */
export function ChatActions({ row, onClose }) {
  const { colors } = useTheme();

  async function act(patch, done) {
    const target = row;
    onClose();
    try {
      await updatePref(target.id, patch);
      showToast({ title: done });
    } catch (error) {
      Alert.alert('Not saved', friendlyMessage(error));
    }
  }

  const item = (title, icon, onPress) => (
    <ListRow
      key={title}
      title={title}
      onPress={onPress}
      leading={<Icon as={icon} color={colors.accent} size={20} />}
      trailing={<View />}
    />
  );

  return (
    <Sheet visible={Boolean(row)} onClose={onClose}>
      {row ? (
        <>
          <Text style={[type.heading, { color: colors.text }]} numberOfLines={1}>
            {row.title}
          </Text>
          <View style={[styles.list, { backgroundColor: colors.bg }]}>
            {row.pinned
              ? item('Unpin', PinOff, () => act({ pinned: false }, 'Unpinned'))
              : item('Pin to top', Pin, () => act({ pinned: true }, 'Pinned'))}
            {row.muted
              ? item('Unmute', Bell, () => act({ muted_until: null }, 'Notifications on'))
              : item('Mute for 8 hours', BellOff, () =>
                  act({ muted_until: eightHoursFromNow() }, 'Muted for 8 hours'),
                )}
            {row.archived
              ? item('Unarchive', ArchiveRestore, () => act({ archived: false }, 'Moved to Inbox'))
              : item('Archive', Archive, () => act({ archived: true }, 'Chat archived'))}
            {row.unread
              ? item('Mark as read', CheckCheck, () => {
                  markChatRead(row.id);
                  onClose();
                })
              : null}
            {item('Info', Info, () => {
              const id = row.id;
              onClose();
              router.push(`/chat-info/${id}`);
            })}
          </View>
        </>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({ list: { borderRadius: radius.field, overflow: 'hidden' } });
