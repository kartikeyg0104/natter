/**
 * Edit profile: your photo, "about" line and phone number. People who save
 * your number find you by it. With ?setup=1 it is the first-run screen
 * after signing up, with a Skip button.
 */
import Camera from 'lucide-react-native/icons/camera';
import Check from 'lucide-react-native/icons/check';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ImageIcon from 'lucide-react-native/icons/image';
import Info from 'lucide-react-native/icons/info';
import Phone from 'lucide-react-native/icons/phone';
import Trash2 from 'lucide-react-native/icons/trash-2';
import Smile from 'lucide-react-native/icons/smile';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { friendlyMessage } from '../src/api/ApiError';
import { uploadFile } from '../src/api/files';
import { showToast } from '../src/alerts/alertStore';
import { Avatar } from '../src/components/avatar/Avatar';
import { Button } from '../src/components/kit/Button';
import { IconButton } from '../src/components/kit/IconButton';
import { TextField } from '../src/components/kit/TextField';
import { radius, space, type } from '../src/constants/theme';
import { useStore } from '../src/hooks/useStore';
import { useTheme } from '../src/hooks/useTheme';
import { primeImage } from '../src/store/imageCache';
import { meStore, saveMe } from '../src/store/socialStores';
import { toDataUri } from '../src/utils/fileData';
import { haptics } from '../src/utils/haptics';
import { takePhoto } from '../src/utils/media';
import { pickPhoto } from '../src/utils/pickPhoto';
import { phoneProblem } from '../src/utils/phone';

const ABOUT_IDEAS = ['Available', 'At the library', 'In class', 'Busy', 'Urgent calls only'];

export default function ProfileEdit() {
  const { setup } = useLocalSearchParams();
  const isSetup = setup === '1';
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const me = useStore(meStore, (s) => s.me);
  const [about, setAbout] = useState(me?.about ?? '');
  const [phone, setPhone] = useState(me?.phoneNumber ?? '');
  const [photoId, setPhotoId] = useState(me?.avatarFileId ?? null);
  const [errors, setErrors] = useState({ phone: '', form: '' });
  const [status, setStatus] = useState('idle');
  const [photoBusy, setPhotoBusy] = useState(false);

  async function choosePhoto(fromCamera) {
    setPhotoBusy(true);
    try {
      const photo = fromCamera ? await takePhoto() : await pickPhoto();
      if (!photo) return;
      const file = await uploadFile({ fileName: photo.fileName, mimeType: photo.mimeType, data: photo.data });
      primeImage(file.id, toDataUri(photo.mimeType, photo.data));
      setPhotoId(file.id);
    } catch (error) {
      setErrors((current) => ({ ...current, form: friendlyMessage(error) }));
    } finally {
      setPhotoBusy(false);
    }
  }

  async function save() {
    const phoneError = phone.trim() ? phoneProblem(phone) : '';
    setErrors({ phone: phoneError, form: '' });
    if (phoneError) return;
    setStatus('loading');
    try {
      const patch = { about: about.trim(), phone_number: phone.trim() };
      if (photoId !== (me?.avatarFileId ?? null)) patch.avatar_file_id = photoId;
      await saveMe(patch);
      setStatus('success');
      haptics.success();
      showToast({ title: 'Profile saved', icon: 'user' });
      router.back();
    } catch (error) {
      setStatus('idle');
      setErrors({ phone: '', form: friendlyMessage(error) });
    }
  }

  return (
    <KeyboardAvoidingView style={[styles.screen, { backgroundColor: colors.bg }]} behavior="padding">
      <View style={[styles.topBar, { paddingTop: insets.top + space.xxs }]}>
        {isSetup ? null : <IconButton icon={ChevronLeft} accessibilityLabel="Back" onPress={() => router.back()} />}
        <Text style={[type.heading, styles.grow, { color: colors.text }, isSetup ? styles.setupTitle : null]}>
          {isSetup ? 'Set up your profile' : 'Edit profile'}
        </Text>
        {isSetup ? (
          <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" style={styles.skip}>
            <Text style={[type.label, { color: colors.accent }]}>Skip</Text>
          </Pressable>
        ) : null}
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {isSetup ? (
          <Text style={[type.body, { color: colors.textMuted }]}>
            Add your phone number so friends who save it can find and message you.
          </Text>
        ) : null}
        <View style={[styles.photoCard, { backgroundColor: colors.card }]}>
          <AvatarPreview photoId={photoId} />
          <View style={styles.photoActions}>
            <Button label="Choose photo" icon={ImageIcon} variant="secondary" status={photoBusy ? 'loading' : 'idle'} onPress={() => choosePhoto(false)} />
            <Button label="Take photo" icon={Camera} variant="secondary" onPress={() => choosePhoto(true)} />
            <Button label="Pick an avatar" icon={Smile} variant="secondary" onPress={() => router.push('/avatar-picker')} />
            {photoId ? <Button label="Remove photo" icon={Trash2} variant="danger" onPress={() => setPhotoId(null)} /> : null}
          </View>
        </View>

        <TextField
          label="Phone number"
          value={phone}
          onChangeText={setPhone}
          placeholder="+91 98100 00001"
          icon={Phone}
          error={errors.phone}
          inputProps={{ keyboardType: 'phone-pad', textContentType: 'telephoneNumber', autoComplete: 'tel' }}
        />
        <Text style={[type.caption, { color: colors.textFaint }]}>
          Include your country code. Leave it empty to stay findable by username only.
        </Text>

        <TextField
          label="About"
          value={about}
          onChangeText={setAbout}
          placeholder="Say something about yourself"
          icon={Info}
          inputProps={{ maxLength: 140 }}
        />
        <View style={styles.ideas}>
          {ABOUT_IDEAS.map((idea) => (
            <Pressable
              key={idea}
              onPress={() => setAbout(idea)}
              accessibilityRole="button"
              style={[styles.idea, { backgroundColor: about === idea ? colors.accentSoft : colors.card, borderColor: colors.line }]}
            >
              <Text style={[type.chip, { color: about === idea ? colors.accent : colors.textMuted }]}>{idea}</Text>
            </Pressable>
          ))}
        </View>

        {errors.form ? <Text style={[type.meta, { color: colors.danger }]}>{errors.form}</Text> : null}
        <Button label="Save" icon={Check} status={status} onPress={save} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Your picture as it will look: the chosen photo, or your generated art. */
function AvatarPreview({ photoId }) {
  const me = useStore(meStore, (s) => s.me);
  return <Avatar name={me?.name ?? ''} size={112} photoId={photoId} preset={photoId ? null : (me?.avatarPreset ?? null)} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.xs, paddingBottom: space.xs },
  setupTitle: { paddingLeft: space.sm },
  skip: { paddingHorizontal: space.sm },
  grow: { flex: 1 },
  content: { padding: space.md, gap: space.md, paddingBottom: space.xxxl },
  photoCard: { alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.card },
  photoActions: { alignSelf: 'stretch', gap: space.xs },
  ideas: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  idea: { height: 32, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, justifyContent: 'center' },
});

