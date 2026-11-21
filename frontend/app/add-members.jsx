/**
 * Add members: tick people who aren't in the group yet, then Add.
 * Param: conversationId.
 */
import Check from 'lucide-react-native/icons/check';
import X from 'lucide-react-native/icons/x';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { friendlyMessage } from '../src/api/ApiError';
import { addMembers } from '../src/api/social';
import { showToast } from '../src/alerts/alertStore';
import { Avatar } from '../src/components/avatar/Avatar';
import { Button } from '../src/components/kit/Button';
import { EmptyState } from '../src/components/kit/EmptyState';
import { Icon } from '../src/components/kit/Icon';
import { IconButton } from '../src/components/kit/IconButton';
import { space, type } from '../src/constants/theme';
import { useStore } from '../src/hooks/useStore';
import { useTheme } from '../src/hooks/useTheme';
import { chatsStore, loadConversations } from '../src/store/chatsStore';
import { directoryStore } from '../src/store/directoryStore';
import { sessionStore } from '../src/store/sessionStore';
import { haptics } from '../src/utils/haptics';
import { filterPeople, toggleId } from '../src/utils/people';
import UsersRound from 'lucide-react-native/icons/users-round';

export default function AddMembers() {
  const { conversationId } = useLocalSearchParams();
  const id = String(conversationId);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const users = useStore(directoryStore, (s) => s.users);
  const myId = useStore(sessionStore, (s) => s.user?.id ?? '');
  const conversation = useStore(chatsStore, (s) => s.conversations.find((item) => item.id === id));
  const [selected, setSelected] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const inGroup = new Set(conversation?.participants_ids ?? []);
  const people = filterPeople(users, '', myId).filter((user) => !inGroup.has(user.id));

  async function add() {
    if (!selected.length) return;
    setStatus('loading');
    try {
      await addMembers(id, selected);
      await loadConversations();
      haptics.success();
      showToast({ title: selected.length === 1 ? 'Member added' : `${selected.length} members added`, icon: 'group' });
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
          Add members
        </Text>
      </View>
      <FlatList
        data={people}
        keyExtractor={(person) => person.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState icon={UsersRound} title="Everyone is already here" message="There's no one left to add." />}
        renderItem={({ item }) => {
          const isSelected = selected.includes(item.id);
          return (
            <Pressable
              onPress={() => {
                haptics.tap();
                setSelected((ids) => toggleId(ids, item.id));
              }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={item.name}
              style={({ pressed }) => [styles.row, pressed ? { backgroundColor: colors.bgSunken } : null]}
            >
              <Avatar name={item.name} size={42} />
              <Text style={[type.bodyStrong, styles.grow, { color: colors.text }]}>{item.name}</Text>
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
          label={selected.length ? `Add ${selected.length}` : 'Pick people'}
          status={status}
          disabled={!selected.length}
          onPress={add}
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
  list: { paddingVertical: space.sm, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingVertical: 10 },
  box: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  footer: { padding: space.md, gap: space.xs, borderTopWidth: StyleSheet.hairlineWidth },
});
