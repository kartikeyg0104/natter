/**
 * Save or edit a contact: a name and a phone number. While you type the
 * number, the app checks whether that number is on Natter, so you know
 * whether you can message it now or should invite them.
 * Params: id (editing), name, phone (prefill).
 */
import Check from 'lucide-react-native/icons/check';
import Phone from 'lucide-react-native/icons/phone';
import Trash2 from 'lucide-react-native/icons/trash-2';
import User from 'lucide-react-native/icons/user';
import X from 'lucide-react-native/icons/x';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { friendlyMessage } from '../src/api/ApiError';
import { lookupNumber } from '../src/api/social';
import { showToast } from '../src/alerts/alertStore';
import { Avatar } from '../src/components/avatar/Avatar';
import { Button } from '../src/components/kit/Button';
import { IconButton } from '../src/components/kit/IconButton';
import { TextField } from '../src/components/kit/TextField';
import { radius, space, type } from '../src/constants/theme';
import { useTheme } from '../src/hooks/useTheme';
import { deleteContact, saveContact } from '../src/store/socialStores';
import { confirmAction } from '../src/utils/confirm';
import { haptics } from '../src/utils/haptics';
import { phoneProblem } from '../src/utils/phone';

export default function ContactEdit() {
  const params = useLocalSearchParams();
  const editingId = params.id ? String(params.id) : null;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(params.name ? String(params.name) : '');
  const [phone, setPhone] = useState(params.phone ? String(params.phone) : '');
  const [errors, setErrors] = useState({ name: '', phone: '', form: '' });
  const [lookup, setLookup] = useState({ state: 'idle', result: null });
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    if (phoneProblem(phone)) {
      setLookup({ state: 'idle', result: null });
      return undefined;
    }
    let isActive = true;
    setLookup((current) => ({ ...current, state: 'checking' }));
    const timer = setTimeout(() => {
      lookupNumber(phone)
        .then((result) => isActive && setLookup({ state: 'done', result }))
        .catch(() => isActive && setLookup({ state: 'idle', result: null }));
    }, 400);
    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [phone]);

  async function save() {
    const next = {
      name: name.trim() ? '' : 'Enter a name.',
      phone: phoneProblem(phone),
      form: '',
    };
    setErrors(next);
    if (next.name || next.phone) return;
    setStatus('loading');
    try {
      await saveContact({ id: editingId, name: name.trim(), phoneNumber: phone });
      setStatus('success');
      haptics.success();
      showToast({ title: editingId ? 'Contact updated' : 'Contact saved', detail: name.trim(), icon: 'user' });
      router.back();
    } catch (error) {
      setStatus('idle');
      setErrors({ ...next, form: friendlyMessage(error) });
    }
  }

  function remove() {
    confirmAction('Delete this contact?', `${name} will be removed from your contacts.`, 'Delete', async () => {
      try {
        await deleteContact(editingId);
        showToast({ title: 'Contact deleted', icon: 'trash' });
        router.back();
      } catch (error) {
        setErrors((current) => ({ ...current, form: friendlyMessage(error) }));
      }
    });
  }

  const found = lookup.result;
  return (
    <KeyboardAvoidingView style={[styles.screen, { backgroundColor: colors.bg }]} behavior="padding">
      <View style={[styles.topBar, { paddingTop: insets.top + space.xxs, borderBottomColor: colors.line, backgroundColor: colors.card }]}>
        <IconButton icon={X} accessibilityLabel="Cancel" onPress={() => router.back()} />
        <Text style={[type.heading, styles.title, { color: colors.text }]} accessibilityRole="header">
          {editingId ? 'Edit contact' : 'New contact'}
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Avatar name={name || 'New contact'} size={84} photoId={found?.avatarFileId ?? null} />
        </View>
        <TextField
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Ishaan from lab"
          icon={User}
          error={errors.name}
          inputProps={{ maxLength: 60, autoCapitalize: 'words' }}
        />
        <TextField
          label="Phone number"
          value={phone}
          onChangeText={setPhone}
          placeholder="+91 98100 00002"
          icon={Phone}
          error={errors.phone}
          inputProps={{ keyboardType: 'phone-pad', textContentType: 'telephoneNumber', autoComplete: 'tel' }}
        />
        {lookup.state !== 'idle' ? (
          <View style={[styles.lookup, { backgroundColor: found?.userId ? colors.accentSoft : colors.card }]}>
            {lookup.state === 'checking' ? (
              <Text style={[type.meta, { color: colors.textMuted }]}>Checking this number…</Text>
            ) : found?.userId ? (
              <View style={styles.lookupRow}>
                <Avatar name={found.name ?? ''} size={32} photoId={found.avatarFileId ?? null} />
                <Text style={[type.meta, styles.grow, { color: colors.accent }]}>
                  On Natter as {found.name}. You can message them once saved.
                </Text>
              </View>
            ) : (
              <Text style={[type.meta, { color: colors.textMuted }]}>
                This number is not on Natter yet. You can still save it and invite them.
              </Text>
            )}
          </View>
        ) : null}
        {errors.form ? <Text style={[type.meta, { color: colors.danger }]}>{errors.form}</Text> : null}
        <Button label={editingId ? 'Save changes' : 'Save contact'} icon={Check} status={status} onPress={save} />
        {editingId ? <Button label="Delete contact" icon={Trash2} variant="danger" onPress={remove} /> : null}
      </ScrollView>
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
  content: { padding: space.md, gap: space.md, paddingBottom: space.xxxl },
  hero: { alignItems: 'center', paddingVertical: space.sm },
  lookup: { padding: space.sm, borderRadius: radius.field },
  lookupRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  grow: { flex: 1 },
});
