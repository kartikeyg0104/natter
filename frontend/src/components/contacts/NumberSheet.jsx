/**
 * NumberSheet: "Message a number". Type any phone number; if it belongs to
 * someone on Natter you can message them straight away (and save them),
 * otherwise invite them.
 */
import MessageCircle from 'lucide-react-native/icons/message-circle';
import Phone from 'lucide-react-native/icons/phone';
import Send from 'lucide-react-native/icons/send';
import UserPlus from 'lucide-react-native/icons/user-plus';
import { router } from 'expo-router';
import { useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import { friendlyMessage } from '../../api/ApiError';
import { lookupNumber } from '../../api/social';
import { BRAND } from '../../constants/brand';
import { radius, space, type } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { openDirectChat } from '../../store/chatsStore';
import { sessionStore } from '../../store/sessionStore';
import { log } from '../../utils/logger';
import { formatPhone, phoneProblem } from '../../utils/phone';
import { Avatar } from '../avatar/Avatar';
import { Button } from '../kit/Button';
import { Sheet } from '../kit/Sheet';
import { TextField } from '../kit/TextField';

export function inviteText() {
  return `Let's chat on ${BRAND.name}. Install Expo Go, open ${BRAND.name}, and sign up with your phone number so I can find you.`;
}

export function invite() {
  Share.share({ message: inviteText() }).catch(() => {});
}

/** @param {{ visible: boolean, onClose: () => void }} props */
export function NumberSheet({ visible, onClose }) {
  const { colors } = useTheme();
  const [phone, setPhone] = useState('');
  const [state, setState] = useState('idle'); // idle | checking | found | missing | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isOpening, setIsOpening] = useState(false);

  function close() {
    setPhone('');
    setState('idle');
    setResult(null);
    setError('');
    onClose();
  }

  async function check() {
    const problem = phoneProblem(phone);
    if (problem) {
      setError(problem);
      return;
    }
    setError('');
    setState('checking');
    try {
      const found = await lookupNumber(phone);
      setResult(found);
      setState(found.userId ? 'found' : 'missing');
    } catch (failure) {
      setError(friendlyMessage(failure));
      setState('error');
    }
  }

  async function message() {
    if (!result?.userId) return;
    setIsOpening(true);
    try {
      const myId = sessionStore.get().user?.id ?? '';
      const id = await openDirectChat(myId, result.userId);
      log.nav(`number -> chat/${id}`);
      close();
      router.push(`/chat/${id}`);
    } catch (failure) {
      setError(friendlyMessage(failure));
    } finally {
      setIsOpening(false);
    }
  }

  function save() {
    close();
    router.push({ pathname: '/contact-edit', params: { phone: result?.phoneNumber ?? phone, name: result?.name ?? '' } });
  }

  return (
    <Sheet visible={visible} onClose={close}>
      <Text style={[type.heading, { color: colors.text }]}>Message a number</Text>
      <TextField
        value={phone}
        onChangeText={(text) => {
          setPhone(text);
          setState('idle');
        }}
        placeholder="+91 98100 00002"
        icon={Phone}
        error={error}
        inputProps={{ keyboardType: 'phone-pad', autoFocus: true, returnKeyType: 'search', onSubmitEditing: check }}
      />
      {state === 'found' ? (
        <View style={[styles.result, { backgroundColor: colors.accentSoft }]}>
          <Avatar name={result.name ?? ''} size={40} photoId={result.avatarFileId ?? null} />
          <View style={styles.grow}>
            <Text style={[type.bodyStrong, { color: colors.text }]}>{result.name}</Text>
            <Text style={[type.meta, { color: colors.textMuted }]}>{formatPhone(result.phoneNumber)} is on {BRAND.name}</Text>
          </View>
        </View>
      ) : null}
      {state === 'missing' ? (
        <View style={[styles.result, { backgroundColor: colors.bg }]}>
          <Text style={[type.meta, styles.grow, { color: colors.textMuted }]}>
            {formatPhone(result?.phoneNumber ?? phone)} is not on {BRAND.name} yet. Invite them, or save the number for later.
          </Text>
        </View>
      ) : null}
      <View style={styles.actions}>
        {state === 'found' ? (
          <>
            <Button label="Message" icon={MessageCircle} status={isOpening ? 'loading' : 'idle'} onPress={message} />
            <Button label="Save to contacts" icon={UserPlus} variant="secondary" onPress={save} />
          </>
        ) : state === 'missing' ? (
          <>
            <Button label="Invite" icon={Send} onPress={invite} />
            <Button label="Save to contacts" icon={UserPlus} variant="secondary" onPress={save} />
          </>
        ) : (
          <Button label="Find" status={state === 'checking' ? 'loading' : 'idle'} onPress={check} />
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  result: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.sm, borderRadius: radius.field },
  grow: { flex: 1 },
  actions: { gap: space.xs },
});
