/**
 * Archived: chats you archived. Long-press one to unarchive it.
 */
import Archive from 'lucide-react-native/icons/archive';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatActions } from '../src/components/inbox/ChatActions';
import { ConversationRow } from '../src/components/inbox/ConversationRow';
import { EmptyState } from '../src/components/kit/EmptyState';
import { IconButton } from '../src/components/kit/IconButton';
import { space, type } from '../src/constants/theme';
import { useInbox } from '../src/hooks/useInbox';
import { useTheme } from '../src/hooks/useTheme';

export default function Archived() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const inbox = useInbox({ archived: true });
  const [actionsFor, setActionsFor] = useState(null);

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={[styles.topBar, { paddingTop: insets.top + space.xxs }]}>
        <IconButton icon={ChevronLeft} accessibilityLabel="Back" onPress={() => router.back()} />
        <Text style={[type.heading, { color: colors.text }]} accessibilityRole="header">
          Archived
        </Text>
      </View>
      <Text style={[type.meta, styles.hint, { color: colors.textMuted }]}>
        Archived chats stay here when new messages arrive. Long-press one to move it back.
      </Text>
      <FlatList
        data={inbox.rows}
        keyExtractor={(row) => row.id}
        renderItem={({ item, index }) => (
          <ConversationRow
            row={item}
            showDivider={index < inbox.rows.length - 1}
            onPress={() => router.push(`/chat/${item.id}`)}
            onLongPress={() => setActionsFor(item)}
          />
        )}
        ListEmptyComponent={<EmptyState icon={Archive} title="No archived chats" message="Long-press a chat in the Inbox to archive it." />}
      />
      <ChatActions row={actionsFor} onClose={() => setActionsFor(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.xs, paddingBottom: space.xs },
  hint: { paddingHorizontal: space.md, paddingBottom: space.sm },
});
