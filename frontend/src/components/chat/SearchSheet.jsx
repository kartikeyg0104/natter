/**
 * SearchSheet: find words in this conversation. Searches the server as you
 * type (after a short pause) and lists matches with who sent them and when.
 */
import Search from 'lucide-react-native/icons/search';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { friendlyMessage } from '../../api/ApiError';
import { searchMessages } from '../../api/social';
import { radius, space, type } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { formatDateTime } from '../../utils/format';
import { Sheet } from '../kit/Sheet';
import { TextField } from '../kit/TextField';

const DEBOUNCE_MS = 350;

/** Splits text around the query so the match can be highlighted. */
function parts(text, query) {
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index < 0 || !query) return [text, '', ''];
  return [text.slice(0, index), text.slice(index, index + query.length), text.slice(index + query.length)];
}

/**
 * @param {{ visible: boolean, onClose: () => void, conversationId: string,
 *   myId: string, usersById: Record<string, { name: string }> }} props
 */
export function SearchSheet({ visible, onClose, conversationId, myId, usersById }) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [state, setState] = useState('idle'); // idle | loading | done | error
  const [error, setError] = useState('');

  function changeQuery(text) {
    setQuery(text);
    setState(text.trim() ? 'loading' : 'idle');
    if (!text.trim()) setResults([]);
  }

  useEffect(() => {
    const q = query.trim();
    if (!visible || !q) return undefined;
    let isActive = true;
    const timer = setTimeout(() => {
      searchMessages(conversationId, q)
        .then((found) => {
          if (!isActive) return;
          setResults(found ?? []);
          setState('done');
        })
        .catch((failure) => {
          if (!isActive) return;
          setError(friendlyMessage(failure));
          setState('error');
        });
    }, DEBOUNCE_MS);
    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [query, visible, conversationId]);

  function close() {
    setQuery('');
    onClose();
  }

  const q = query.trim();
  return (
    <Sheet visible={visible} onClose={close} style={styles.sheet}>
      <Text style={[type.heading, { color: colors.text }]}>Search this chat</Text>
      <TextField
        value={query}
        onChangeText={changeQuery}
        placeholder="Words to find"
        icon={Search}
        inputProps={{ autoFocus: true, returnKeyType: 'search' }}
      />
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
        {state === 'loading' ? <ActivityIndicator color={colors.accent} /> : null}
        {state === 'error' ? <Text style={[type.meta, { color: colors.danger }]}>{error}</Text> : null}
        {state === 'done' && !results.length ? (
          <Text style={[type.meta, { color: colors.textMuted }]}>{`No messages mention “${q}”.`}</Text>
        ) : null}
        {state === 'done' && results.length ? (
          <Text style={[type.caption, { color: colors.textFaint }]}>
            {results.length === 1 ? '1 match' : `${results.length} matches`}
          </Text>
        ) : null}
        {results.map((message) => {
          const [before, match, after] = parts(message.content ?? '', q);
          const who = message.senderId === myId ? 'You' : (usersById[message.senderId]?.name ?? 'Unknown');
          return (
            <View key={message.id} style={[styles.result, { backgroundColor: colors.bg }]}>
              <View style={styles.resultHead}>
                <Text style={[type.micro, { color: colors.accent }]}>{who}</Text>
                <Text style={[type.caption, { color: colors.textFaint }]}>{formatDateTime(message.createdAt)}</Text>
              </View>
              <Text style={[type.body, { color: colors.text }]} numberOfLines={3}>
                {before}
                <Text style={{ backgroundColor: colors.highlight, color: colors.onHighlight }}>{match}</Text>
                {after}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  sheet: { height: '80%' },
  list: { flex: 1 },
  listContent: { gap: space.xs, paddingBottom: space.lg },
  result: { padding: space.sm, borderRadius: radius.field, gap: 4 },
  resultHead: { flexDirection: 'row', justifyContent: 'space-between' },
});
