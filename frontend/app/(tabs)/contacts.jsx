/**
 * Contacts: your address book.
 * - New group, New contact, Message a number
 * - My contacts (saved numbers, A to Z): tap to message, or invite when the
 *   number isn't on Natter yet; long-press to edit
 * - More people on Natter: everyone else on the server
 * On a server without contacts it is just the list of people.
 */
import { formatPhone } from '../../src/utils/phone';
import Hash from 'lucide-react-native/icons/hash';
import MessageCircle from 'lucide-react-native/icons/message-circle';
import Search from 'lucide-react-native/icons/search';
import Send from 'lucide-react-native/icons/send';
import UserPlus from 'lucide-react-native/icons/user-plus';
import UserX from 'lucide-react-native/icons/user-x';
import UsersRound from 'lucide-react-native/icons/users-round';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { friendlyMessage } from '../../src/api/ApiError';
import { Avatar } from '../../src/components/avatar/Avatar';
import { invite, NumberSheet } from '../../src/components/contacts/NumberSheet';
import { Aurora } from '../../src/components/kit/Aurora';
import { EmptyState } from '../../src/components/kit/EmptyState';
import { Icon } from '../../src/components/kit/Icon';
import { IconButton } from '../../src/components/kit/IconButton';
import { ListRow } from '../../src/components/kit/ListRow';
import { ListSkeleton } from '../../src/components/kit/Skeleton';
import { TextField } from '../../src/components/kit/TextField';
import { radius, space, type } from '../../src/constants/theme';
import { useStore } from '../../src/hooks/useStore';
import { useTheme } from '../../src/hooks/useTheme';
import { openDirectChat } from '../../src/store/chatsStore';
import { directoryStore, loadUsers } from '../../src/store/directoryStore';
import { sessionStore } from '../../src/store/sessionStore';
import { contactsStore, featuresStore, loadContacts, peopleStore } from '../../src/store/socialStores';
import { formatPresence } from '../../src/utils/format';
import { log } from '../../src/utils/logger';
import { filterPeople } from '../../src/utils/people';

function Lead({ icon, colors }) {
  return (
    <View style={[styles.leadTile, { backgroundColor: colors.accentSoft }]}>
      <Icon as={icon} color={colors.accent} size={22} />
    </View>
  );
}

export default function Contacts() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const directory = useStore(directoryStore);
  const myId = useStore(sessionStore, (s) => s.user?.id ?? '');
  const hasContacts = useStore(featuresStore, (s) => s.features.includes('contacts'));
  const { contacts } = useStore(contactsStore);
  const presence = useStore(peopleStore, (s) => s.byId);
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isNumberOpen, setIsNumberOpen] = useState(false);

  useEffect(() => {
    loadUsers();
    loadContacts();
  }, []);

  async function refresh() {
    setIsRefreshing(true);
    await Promise.all([loadUsers(), loadContacts()]);
    setIsRefreshing(false);
  }

  async function message(userId, label) {
    if (busyId) return;
    setBusyId(userId);
    try {
      const id = await openDirectChat(myId, userId);
      log.nav(`contacts -> chat/${id} (${label})`);
      router.push(`/chat/${id}`);
    } catch (error) {
      Alert.alert("Couldn't open the conversation", friendlyMessage(error));
    } finally {
      setBusyId(null);
    }
  }

  function edit(contact) {
    router.push({ pathname: '/contact-edit', params: { id: contact.id, name: contact.name, phone: contact.phoneNumber } });
  }

  const needle = query.trim().toLowerCase();
  const savedUserIds = new Set(contacts.map((contact) => contact.userId).filter(Boolean));
  const myContacts = contacts.filter(
    (contact) =>
      contact.userId !== myId &&
      (!needle || contact.name.toLowerCase().includes(needle) || contact.phoneNumber.includes(needle)),
  );
  const others = filterPeople(directory.users, query, myId).filter(
    (user) => user.id !== myId && !savedUserIds.has(user.id),
  );

  const sections = [];
  if (myContacts.length) sections.push({ key: 'mine', title: 'My contacts', data: myContacts });
  if (others.length) {
    sections.push({ key: 'others', title: hasContacts ? 'More people on Natter' : 'People on Natter', data: others });
  }
  const isLoading = directory.status === 'loading' || directory.status === 'idle';

  const header = (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <ListRow
        title="New group"
        tone="accent"
        onPress={() => router.push('/new-group')}
        leading={<Lead icon={UsersRound} colors={colors} />}
      />
      {hasContacts ? (
        <ListRow
          title="New contact"
          tone="accent"
          onPress={() => router.push('/contact-edit')}
          leading={<Lead icon={UserPlus} colors={colors} />}
        />
      ) : null}
      {hasContacts ? (
        <ListRow
          title="Message a number"
          tone="accent"
          onPress={() => setIsNumberOpen(true)}
          leading={<Lead icon={Hash} colors={colors} />}
        />
      ) : null}
    </View>
  );

  function renderEmpty() {
    if (isLoading) return <ListSkeleton rows={5} />;
    if (directory.status === 'error') {
      return (
        <EmptyState icon={UserX} title="Couldn't load contacts" message={directory.error} actionLabel="Try again" onAction={refresh} />
      );
    }
    return (
      <EmptyState
        icon={Search}
        title={query ? 'No one by that name or number' : 'No one else is here yet'}
        message={query ? 'Check the spelling, or try part of the name.' : 'Save a number, or invite friends to join.'}
      />
    );
  }

  function renderItem(args) {
    const { index, section } = args;
    const order = section.key === 'mine' ? index : index + myContacts.length;
    return (
      <Animated.View entering={order < 10 ? FadeInDown.delay(order * 40).duration(300) : undefined}>
        {renderRow(args)}
      </Animated.View>
    );
  }

  function renderRow({ item, index, section }) {
    const isLast = index === section.data.length - 1;
    const wrap = [styles.rowWrap, { backgroundColor: colors.card }, index === 0 && styles.roundTop, isLast && styles.roundBottom];

    if (section.key === 'mine') {
      const user = item.userId ? directory.byId[item.userId] : null;
      const onNatter = Boolean(item.userId);
      return (
        <Pressable onLongPress={() => edit(item)} delayLongPress={400} style={wrap}>
          <ListRow
            title={item.name}
            subtitle={onNatter ? user?.about || formatPhone(item.phoneNumber) : `${formatPhone(item.phoneNumber)} · not on Natter`}
            onPress={() => (onNatter ? message(item.userId, item.name) : invite())}
            showDivider={!isLast}
            accessibilityLabel={onNatter ? `Message ${item.name}` : `Invite ${item.name}`}
            leading={<Avatar name={user?.name ?? item.name} size={42} />}
            trailing={
              busyId === item.userId && onNatter ? (
                <ActivityIndicator color={colors.accent} />
              ) : onNatter ? (
                <Icon as={MessageCircle} color={colors.accent} size={20} />
              ) : (
                <View style={[styles.invite, { backgroundColor: colors.accentSoft }]}>
                  <Icon as={Send} color={colors.accent} size={14} />
                  <Text style={[type.micro, { color: colors.accent }]}>Invite</Text>
                </View>
              )
            }
          />
        </Pressable>
      );
    }

    const status = formatPresence(presence[item.id]);
    return (
      <View style={wrap}>
        <ListRow
          title={item.name}
          subtitle={busyId === item.id ? 'Opening…' : status || item.about || 'Tap to message'}
          onPress={() => message(item.id, item.name)}
          showDivider={!isLast}
          accessibilityLabel={`Message ${item.name}`}
          leading={<Avatar name={item.name} size={42} />}
          trailing={
            busyId === item.id ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <Icon as={MessageCircle} color={colors.accent} size={20} />
            )
          }
        />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <Aurora />
      <View style={styles.header}>
        <Text style={[type.title, styles.grow, { color: colors.text }]} accessibilityRole="header">
          Contacts
        </Text>
        {hasContacts ? (
          <IconButton
            icon={UserPlus}
            variant="tinted"
            size={44}
            accessibilityLabel="Add contact"
            onPress={() => router.push('/contact-edit')}
          />
        ) : null}
      </View>
      <View style={styles.search}>
        <TextField
          value={query}
          onChangeText={setQuery}
          placeholder={hasContacts ? 'Search name or number' : 'Search by name'}
          icon={Search}
          inputProps={{ autoCapitalize: 'none', returnKeyType: 'search' }}
        />
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        ListEmptyComponent={renderEmpty()}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.list}
        renderSectionHeader={({ section }) => (
          <Text style={[type.label, styles.sectionTitle, { color: colors.textMuted }]}>
            {section.title} · {section.data.length}
          </Text>
        )}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={colors.accent} colors={[colors.accent]} />
        }
      />
      <NumberSheet visible={isNumberOpen} onClose={() => setIsNumberOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.md, paddingTop: space.sm, paddingBottom: space.sm },
  grow: { flex: 1 },
  search: { paddingHorizontal: space.md, paddingBottom: space.sm },
  card: { borderRadius: radius.card, overflow: 'hidden', marginHorizontal: space.md, marginTop: space.xs },
  leadTile: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { paddingHorizontal: space.md + space.xxs, paddingTop: space.lg, paddingBottom: space.xs },
  rowWrap: { marginHorizontal: space.md, overflow: 'hidden' },
  roundTop: { borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card },
  roundBottom: { borderBottomLeftRadius: radius.card, borderBottomRightRadius: radius.card },
  invite: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, height: 26, borderRadius: 8 },
  list: { paddingBottom: space.xl, flexGrow: 1 },
});
