/**
 * New group: name it, tick at least two people, then Create (top right).
 * Chosen people show as removable chips above the list. On success the app
 * moves straight into the new group.
 */
import Check from 'lucide-react-native/icons/check';
import Search from 'lucide-react-native/icons/search';
import Tag from 'lucide-react-native/icons/tag';
import X from 'lucide-react-native/icons/x';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { friendlyMessage } from '../src/api/ApiError';
import { notifyGroupCreated } from '../src/alerts/notify';
import { Avatar } from '../src/components/avatar/Avatar';
import { Icon } from '../src/components/kit/Icon';
import { IconButton } from '../src/components/kit/IconButton';
import { TextField } from '../src/components/kit/TextField';
import { LOGIN_SUCCESS_HOLD_MS } from '../src/constants/config';
import { radius, space, type } from '../src/constants/theme';
import { useStore } from '../src/hooks/useStore';
import { useTheme } from '../src/hooks/useTheme';
import { createGroup } from '../src/store/chatsStore';
import { directoryStore, loadUsers } from '../src/store/directoryStore';
import { sessionStore } from '../src/store/sessionStore';
import { haptics } from '../src/utils/haptics';
import { log } from '../src/utils/logger';
import { filterPeople, groupFormProblem, MAX_GROUP_NAME, toggleId } from '../src/utils/people';

export default function NewGroup() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const users = useStore(directoryStore, (s) => s.users);
  const usersById = useStore(directoryStore, (s) => s.byId);
  const myId = useStore(sessionStore, (s) => s.user?.id ?? '');
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!users.length) loadUsers();
  }, [users.length]);

  const people = filterPeople(users, query, myId).filter((user) => user.id !== myId);
  const problem = groupFormProblem(name, selectedIds);
  const canCreate = !problem && status === 'idle';

  async function create() {
    if (!canCreate) return;
    setStatus('loading');
    setError('');
    try {
      const id = await createGroup(name, selectedIds);
      setStatus('success');
      haptics.success();
      await new Promise((resolve) => setTimeout(resolve, LOGIN_SUCCESS_HOLD_MS));
      notifyGroupCreated(name.trim());
      log.nav(`new-group -> chat/${id}`);
      router.replace(`/chat/${id}`);
    } catch (failure) {
      setStatus('idle');
      setError(friendlyMessage(failure));
    }
  }

  function toggle(id) {
    haptics.tap();
    setSelectedIds((ids) => toggleId(ids, id));
  }

  return (
    <KeyboardAvoidingView style={[styles.screen, { backgroundColor: colors.bg }]} behavior="padding">
      <View
        style={[
          styles.topBar,
          { paddingTop: insets.top + space.xxs, backgroundColor: colors.card, borderBottomColor: colors.line },
        ]}
      >
        <IconButton icon={X} accessibilityLabel="Cancel" onPress={() => router.back()} />
        <Text style={[type.heading, styles.title, { color: colors.text }]} accessibilityRole="header">
          New group
        </Text>
        <Pressable
          onPress={create}
          disabled={!canCreate}
          accessibilityRole="button"
          accessibilityLabel="Create group"
          accessibilityState={{ disabled: !canCreate }}
          style={[styles.create, { backgroundColor: canCreate ? colors.accent : colors.bgSunken }]}
        >
          {status === 'loading' ? (
            <ActivityIndicator size="small" color={colors.onAccent} />
          ) : status === 'success' ? (
            <Icon as={Check} color={colors.onAccent} size={18} />
          ) : (
            <Text style={[type.label, { color: canCreate ? colors.onAccent : colors.textFaint }]}>Create</Text>
          )}
        </Pressable>
      </View>

      <FlatList
        data={people}
        keyExtractor={(person) => person.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.form}>
            <TextField
              label="Group name"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Physics lab"
              icon={Tag}
              error={error}
              inputProps={{ maxLength: MAX_GROUP_NAME }}
            />
            {selectedIds.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {selectedIds.map((id) => (
                  <Pressable
                    key={id}
                    onPress={() => toggle(id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${usersById[id]?.name ?? ''}`}
                    style={[styles.chip, { backgroundColor: colors.accentSoft }]}
                  >
                    <Avatar name={usersById[id]?.name ?? ''} size={22} />
                    <Text style={[type.chip, { color: colors.accent }]}>{usersById[id]?.name ?? ''}</Text>
                    <Icon as={X} color={colors.accent} size={14} />
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
            <Text style={[type.meta, { color: problem ? colors.textMuted : colors.success }]}>
              {problem || `Ready: ${selectedIds.length} people plus you.`}
            </Text>
            <TextField
              value={query}
              onChangeText={setQuery}
              placeholder="Find people"
              icon={Search}
              inputProps={{ autoCapitalize: 'none' }}
            />
          </View>
        }
        renderItem={({ item, index }) => {
          const isSelected = selectedIds.includes(item.id);
          return (
            <Pressable
              onPress={() => toggle(item.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={item.name}
              style={({ pressed }) => [
                styles.person,
                { backgroundColor: pressed ? colors.cardPressed : colors.card },
                index === 0 && styles.roundTop,
                index === people.length - 1 && styles.roundBottom,
              ]}
            >
              <Avatar name={item.name} size={40} />
              <Text style={[type.bodyStrong, styles.personName, { color: colors.text }]}>{item.name}</Text>
              <View
                style={[
                  styles.box,
                  isSelected
                    ? { backgroundColor: colors.accent, borderColor: colors.accent }
                    : { borderColor: colors.line },
                ]}
              >
                {isSelected ? <Icon as={Check} color={colors.onAccent} size={15} /> : null}
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Text style={[type.meta, styles.empty, { color: colors.textMuted }]}>
            {users.length ? 'No one by that name.' : 'Loading people…'}
          </Text>
        }
      />
    </KeyboardAvoidingView>
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
  title: { flex: 1 },
  create: {
    height: 36,
    minWidth: 76,
    paddingHorizontal: 14,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: space.xxs,
  },
  list: { padding: space.md, paddingBottom: space.xxxl },
  form: { gap: space.sm, marginBottom: space.md },
  chips: { gap: space.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 4,
    paddingRight: 10,
    height: 30,
    borderRadius: 10,
  },
  person: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingVertical: 10 },
  personName: { flex: 1 },
  roundTop: { borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card },
  roundBottom: { borderBottomLeftRadius: radius.card, borderBottomRightRadius: radius.card },
  box: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  empty: { textAlign: 'center', paddingVertical: space.xl },
});
