/**
 * MembersSheet: who is in a group, opened from the conversation's title.
 */
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { space, type } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { Avatar } from '../avatar/Avatar';

import { Sheet } from '../kit/Sheet';

/**
 * @param {{ visible: boolean, onClose: () => void, title: string, names: string[], myName: string }} props
 */
export function MembersSheet({ visible, onClose, title, names, myName }) {
  const { colors } = useTheme();
  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={styles.head}>
        <Text style={[type.heading, { color: colors.text }]}>{title}</Text>
        <Text style={[type.meta, { color: colors.textMuted }]}>
          {names.length === 1 ? '1 member' : `${names.length} members`}
        </Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.list}>
        {names.map((name, index) => (
          <View key={`${name}-${index}`} style={styles.row}>
            <Avatar name={name} size={40} />
            <Text style={[type.bodyStrong, styles.name, { color: colors.text }]}>{name}</Text>
            {name === myName ? (
              <View style={[styles.you, { backgroundColor: colors.accentSoft }]}>
                <Text style={[type.micro, { color: colors.accent }]}>You</Text>
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  head: { gap: 2 },
  scroll: { maxHeight: 360 },
  list: { gap: space.sm, paddingBottom: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  name: { flex: 1 },
  you: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
});
