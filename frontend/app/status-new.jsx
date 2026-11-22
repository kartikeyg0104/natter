/**
 * New text status: big type on a colour. Tap the palette to change the
 * colour, then post. It disappears after 24 hours.
 */
import Palette from 'lucide-react-native/icons/palette';
import Send from 'lucide-react-native/icons/send';
import X from 'lucide-react-native/icons/x';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { friendlyMessage } from '../src/api/ApiError';
import { postStatus } from '../src/api/social';
import { showToast } from '../src/alerts/alertStore';
import { IconButton } from '../src/components/kit/IconButton';
import { PressableScale } from '../src/components/kit/PressableScale';
import { Icon } from '../src/components/kit/Icon';
import { fonts, space, type } from '../src/constants/theme';
import { loadStatus } from '../src/store/socialStores';
import { haptics } from '../src/utils/haptics';

const STATUS_BACKGROUNDS = ['#2F45D8', '#1F9D63', '#C2561A', '#7A4FE0', '#E2577A', '#0E8FA8', '#141A2E'];
const MAX = 700;

export default function StatusNew() {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [index, setIndex] = useState(0);
  const [isPosting, setIsPosting] = useState(false);
  const background = STATUS_BACKGROUNDS[index];

  async function post() {
    if (!text.trim() || isPosting) return;
    setIsPosting(true);
    try {
      await postStatus({ text: text.trim(), background });
      await loadStatus();
      haptics.success();
      showToast({ title: 'Status posted' });
      router.back();
    } catch (error) {
      setIsPosting(false);
      Alert.alert('Status not posted', friendlyMessage(error));
    }
  }

  return (
    <KeyboardAvoidingView style={[styles.screen, { backgroundColor: background }]} behavior="padding">
      <View style={[styles.top, { paddingTop: insets.top + space.xs }]}>
        <IconButton icon={X} color="#FFFFFF" accessibilityLabel="Close" onPress={() => router.back()} />
        <IconButton
          icon={Palette}
          color="#FFFFFF"
          accessibilityLabel="Change colour"
          onPress={() => {
            haptics.tap();
            setIndex((value) => (value + 1) % STATUS_BACKGROUNDS.length);
          }}
        />
      </View>
      <View style={styles.middle}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Type a status"
          placeholderTextColor="rgba(255,255,255,0.6)"
          style={styles.input}
          multiline
          maxLength={MAX}
          autoFocus
          selectionColor="#FFFFFF"
          accessibilityLabel="Status text"
        />
      </View>
      <View style={[styles.bottom, { paddingBottom: insets.bottom + space.md }]}>
        <Text style={[type.caption, styles.hint]}>Visible to people you chat with for 24 hours</Text>
        <PressableScale onPress={post} disabled={!text.trim()} accessibilityLabel="Post status">
          <View style={[styles.send, { opacity: text.trim() ? 1 : 0.5 }]}>
            {isPosting ? <ActivityIndicator color={background} /> : <Icon as={Send} color={background} size={22} />}
          </View>
        </PressableScale>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  top: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: space.sm },
  middle: { flex: 1, justifyContent: 'center', paddingHorizontal: space.xl },
  input: { fontFamily: fonts.display, fontSize: 30, lineHeight: 38, color: '#FFFFFF', textAlign: 'center' },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.md },
  hint: { color: 'rgba(255,255,255,0.8)', flex: 1 },
  send: { width: 54, height: 54, borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
});
