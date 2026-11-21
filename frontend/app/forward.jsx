/**
 * Forward: pick up to five chats and send them a copy of a message.
 * Param: messageId.
 */
import Check from 'lucide-react-native/icons/check';
import Search from 'lucide-react-native/icons/search';
import Send from 'lucide-react-native/icons/send';
import X from 'lucide-react-native/icons/x';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { friendlyMessage } from '../src/api/ApiError';
import { forwardMessage } from '../src/api/social';
import { showToast } from '../src/alerts/alertStore';
import { Avatar } from '../src/components/avatar/Avatar';
import { GroupAvatar } from '../src/components/avatar/GroupAvatar';
import { Button } from '../src/components/kit/Button';
import { Icon } from '../src/components/kit/Icon';
import { IconButton } from '../src/components/kit/IconButton';
import { TextField } from '../src/components/kit/TextField';
import { space, type } from '../src/constants/theme';
import { useInbox } from '../src/hooks/useInbox';
import { useTheme } from '../src/hooks/useTheme';
import { haptics } from '../src/utils/haptics';
import { toggleId } from '../src/utils/people';

const MAX_TARGETS = 5;

export default function ForwardScreen() {
  const { messageId } = useLocalSearchParams();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const inbox = useInbox();
  const archived = useInbox({ archived: true });
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const needle = query.trim().toLowerCase();
  const rows = [...inbox.rows, ...archived.rows].filter((row) => !needle || row.title.toLowerCase().includes(needle));

  function toggle(id) {
    if (!selected.includes(id) && selected.length >= MAX_TARGETS) {
      setError(`You can forward to up to ${MAX_TARGETS} chats at once.`);
      return;
    }
    setError('');
    haptics.tap();
    setSelected((ids) => toggleId(ids, id));
  }

  async function send() {
    if (!selected.length || status !== 'idle') return;
    setStatus('loading');
    try {
      await forwardMessage(String(messageId), selected);
      setStatus('success');
      haptics.success();
      showToast({ title: selected.length === 1 ? 'Forwarded' : `Forwarded to ${selected.length} chats` });
      router.back();
    } catch (failure) {
      setStatus('idle');
      setError(friendlyMessage(failure));
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={[styles.topBar, { paddingTop: insets.top + space.xxs, backgroundColor: colors.card, borderBottomColor: colors.line }]}>
        <IconButton icon={X} accessibilityLabel="Cancel" onPress={() => router.back()} />
        <Text style={[type.heading, styles.grow, { color: colors.text }]} accessibilityRole="header">
          Forward to…
        </Text>
      </View>
      <View style={styles.search}>
        <TextField value={query} onChangeText={setQuery} placeholder="Search chats" icon={Search} />
      </View>
      <FlatList
        data={rows}
        keyExtractor={(row) => row.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const isSelected = selected.includes(item.id);
          return (
            <Pressable
              onPress={() => toggle(item.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={item.title}
              style={({ pressed }) => [styles.row, pressed ? { backgroundColor: colors.bgSunken } : null]}
            >
              {item.kind === 'group' ? <GroupAvatar names={item.names} size={44} /> : <Avatar name={item.title} size={44} />}
              <Text style={[type.bodyStrong, styles.grow, { color: colors.text }]} numberOfLines={1}>
                {item.title}
              </Text>
              <View
                style={[
                  styles.box,
                  isSelected ? { backgroundColor: colors.accent, borderColor: colors.accent } : { borderColor: colors.line },
                ]}
              >
                {isSelected ? <Icon as={Check} color={colors.onAccent} size={15} /> : null}
              </View>
            </Pressable>
          );
        }}
      />
      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.line, paddingBottom: insets.bottom + space.sm }]}>
        {error ? <Text style={[type.meta, { color: colors.danger }]}>{error}</Text> : null}
        <Button
          label={selected.length ? `Send to ${selected.length}` : 'Pick chats'}
          icon={Send}
          status={status}
          disabled={!selected.length}
          onPress={send}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.xs,
    paddingBottom: space.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  grow: { flex: 1 },
  search: { padding: space.md, paddingBottom: space.xs },
  list: { paddingBottom: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingVertical: 10 },
  box: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  footer: { padding: space.md, gap: space.xs, borderTopWidth: StyleSheet.hairlineWidth },
});
