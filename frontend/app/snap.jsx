/**
 * Snap camera: a full-screen viewfinder. Take a photo (or pick one), add a
 * caption, choose how long it can be seen (3, 5 or 10 seconds), then send it
 * to one or more chats. Snaps can be opened once, then they're gone.
 */
import Check from 'lucide-react-native/icons/check';
import ImageIcon from 'lucide-react-native/icons/image';
import RefreshCcw from 'lucide-react-native/icons/refresh-ccw';
import Send from 'lucide-react-native/icons/send';
import Timer from 'lucide-react-native/icons/timer';
import Type from 'lucide-react-native/icons/type';
import X from 'lucide-react-native/icons/x';
import Zap from 'lucide-react-native/icons/zap';
import ZapOff from 'lucide-react-native/icons/zap-off';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSequence, withTiming, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { friendlyMessage } from '../src/api/ApiError';
import { uploadFile } from '../src/api/files';
import { sendSnap } from '../src/api/social';
import { showToast } from '../src/alerts/alertStore';
import { Avatar } from '../src/components/avatar/Avatar';
import { GroupAvatar } from '../src/components/avatar/GroupAvatar';
import { Button } from '../src/components/kit/Button';
import { Gradient } from '../src/components/kit/Gradient';
import { Icon } from '../src/components/kit/Icon';
import { PressableScale } from '../src/components/kit/PressableScale';
import { Sheet } from '../src/components/kit/Sheet';
import { fonts, space, type } from '../src/constants/theme';
import { useInbox } from '../src/hooks/useInbox';
import { useTheme } from '../src/hooks/useTheme';
import { haptics } from '../src/utils/haptics';
import { log } from '../src/utils/logger';
import { toggleId } from '../src/utils/people';
import { pickPhoto } from '../src/utils/pickPhoto';

const TIMERS = [3, 5, 10];

function RoundButton({ icon, label, onPress, active }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.round, active ? styles.roundActive : null]}
    >
      <Icon as={icon} color={active ? '#141A2E' : '#FFFFFF'} size={22} />
    </Pressable>
  );
}

export default function Snap() {
  const { to } = useLocalSearchParams();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState('back');
  const [flash, setFlash] = useState('off');
  const [photo, setPhoto] = useState(null); // { uri, data, mimeType, fileName }
  const [caption, setCaption] = useState('');
  const [isCaptioning, setIsCaptioning] = useState(false);
  const [seconds, setSeconds] = useState(5);
  const [isSendOpen, setIsSendOpen] = useState(false);
  const [targets, setTargets] = useState(() => (to ? [String(to)] : []));
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [isTaking, setIsTaking] = useState(false);
  const inbox = useInbox();
  const flashFade = useSharedValue(0);
  const shutter = useSharedValue(1);
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashFade.get() }));
  const shutterStyle = useAnimatedStyle(() => ({ transform: [{ scale: shutter.get() }] }));

  async function capture() {
    if (!cameraRef.current || isTaking) return;
    setIsTaking(true);
    try {
      haptics.select();
      shutter.set(withSequence(withTiming(0.85, { duration: 90 }), withTiming(1, { duration: 160 })));
      flashFade.set(withSequence(withTiming(0.9, { duration: 60 }), withTiming(0, { duration: 380 })));
      const shot = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });
      // On web the camera returns a data URL (often PNG); on phones plain JPEG base64.
      const raw = String(shot.base64 ?? '');
      const mimeType = raw.match(/^data:([^;,]+)/)?.[1] ?? 'image/jpeg';
      const data = raw.replace(/^data:[^,]+,/, '');
      const extension = mimeType.split('/')[1] === 'png' ? 'png' : 'jpg';
      setPhoto({ uri: shot.uri, data, mimeType, fileName: `snap-${Date.now()}.${extension}` });
    } catch (failure) {
      log.warn(`snap capture failed: ${failure?.message ?? failure}`);
      setError("Couldn't take the photo. Try again.");
    } finally {
      setIsTaking(false);
    }
  }

  async function fromGallery() {
    try {
      const picked = await pickPhoto();
      if (picked) setPhoto(picked);
    } catch (failure) {
      setError(failure?.message ?? "Couldn't open that photo.");
    }
  }

  function retake() {
    setPhoto(null);
    setCaption('');
    setIsCaptioning(false);
    setError('');
  }

  async function send() {
    if (!photo || !targets.length) return;
    setStatus('loading');
    setError('');
    try {
      const file = await uploadFile({ fileName: photo.fileName, mimeType: photo.mimeType, data: photo.data });
      for (const conversationId of targets) {
        await sendSnap({ conversationId, fileId: file.id, caption: caption.trim(), seconds });
      }
      setStatus('success');
      haptics.success();
      showToast({ title: targets.length === 1 ? 'Snap sent' : `Snap sent to ${targets.length} chats`, icon: 'image' });
      router.back();
    } catch (failure) {
      setStatus('idle');
      setError(friendlyMessage(failure));
    }
  }

  // ── Preview of the taken photo ──
  if (photo) {
    return (
      <KeyboardAvoidingView style={styles.screen} behavior="padding">
        <Animated.View entering={ZoomIn.duration(260)} style={StyleSheet.absoluteFill}>
          <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
        </Animated.View>
        {isCaptioning || caption ? (
          <View style={styles.captionBand}>
            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder="Add a caption"
              placeholderTextColor="rgba(255,255,255,0.7)"
              autoFocus={isCaptioning}
              onBlur={() => setIsCaptioning(false)}
              maxLength={120}
              style={styles.captionInput}
              accessibilityLabel="Caption"
            />
          </View>
        ) : null}
        <View style={[styles.topRow, { paddingTop: insets.top + space.xs }]}>
          <RoundButton icon={X} label="Retake" onPress={retake} />
          <View style={styles.sideTools}>
            <RoundButton icon={Type} label="Add caption" onPress={() => setIsCaptioning(true)} active={Boolean(caption)} />
          </View>
        </View>
        <View style={[styles.bottom, { paddingBottom: insets.bottom + space.md }]}>
          <Animated.View entering={FadeIn.delay(150)} style={styles.timerRow} accessibilityRole="radiogroup">
            <Icon as={Timer} color="#FFFFFF" size={18} />
            {TIMERS.map((value) => (
              <Pressable
                key={value}
                onPress={() => {
                  haptics.tap();
                  setSeconds(value);
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: seconds === value }}
                accessibilityLabel={`${value} seconds`}
                style={[styles.timer, seconds === value ? styles.timerActive : null]}
              >
                <Text style={[type.label, { color: seconds === value ? '#141A2E' : '#FFFFFF' }]}>{value}s</Text>
              </Pressable>
            ))}
          </Animated.View>
          {error ? <Text style={[type.meta, styles.error]}>{error}</Text> : null}
          <PressableScale onPress={() => setIsSendOpen(true)} accessibilityLabel="Send to">
            <Gradient style={styles.sendPill}>
              <Text style={[type.bodyStrong, styles.white]}>Send to</Text>
              <Icon as={Send} color="#FFFFFF" size={20} />
            </Gradient>
          </PressableScale>
        </View>

        <Sheet visible={isSendOpen} onClose={() => setIsSendOpen(false)} style={styles.sendSheet}>
          <Text style={[type.heading, { color: colors.text }]}>Send snap to…</Text>
          <FlatList
            data={inbox.rows}
            keyExtractor={(row) => row.id}
            style={styles.list}
            renderItem={({ item }) => {
              const isSelected = targets.includes(item.id);
              return (
                <Pressable
                  onPress={() => {
                    haptics.tap();
                    setTargets((ids) => toggleId(ids, item.id));
                  }}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected }}
                  accessibilityLabel={item.title}
                  style={styles.target}
                >
                  {item.kind === 'group' ? <GroupAvatar names={item.names} size={42} /> : <Avatar name={item.title} size={42} />}
                  <Text style={[type.bodyStrong, styles.grow, { color: colors.text }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View
                    style={[
                      styles.box,
                      isSelected ? { backgroundColor: colors.accent, borderColor: colors.accent } : { borderColor: colors.line },
                    ]}
                  >
                    {isSelected ? <Icon as={Check} color="#FFFFFF" size={15} /> : null}
                  </View>
                </Pressable>
              );
            }}
          />
          {error ? <Text style={[type.meta, { color: colors.danger }]}>{error}</Text> : null}
          <Button
            label={targets.length ? `Send to ${targets.length}` : 'Pick who gets it'}
            icon={Send}
            status={status}
            disabled={!targets.length}
            onPress={send}
          />
        </Sheet>
      </KeyboardAvoidingView>
    );
  }

  // ── Camera ──
  if (!permission?.granted) {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top }]}>
        <View style={[styles.topRow, styles.absoluteTop, { paddingTop: insets.top + space.xs }]}>
          <RoundButton icon={X} label="Close camera" onPress={() => router.back()} />
        </View>
        <Text style={[type.title, styles.white, styles.centerText]}>Snap something</Text>
        <Text style={[type.body, styles.dim, styles.centerText]}>
          Allow the camera to take snaps. You can also send a photo from your gallery.
        </Text>
        <View style={styles.permissionActions}>
          <Button label="Allow camera" onPress={requestPermission} />
          <Button label="Choose from gallery" icon={ImageIcon} variant="panel" onPress={fromGallery} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} flash={flash} />
      <View style={[styles.topRow, { paddingTop: insets.top + space.xs }]}>
        <RoundButton icon={X} label="Close camera" onPress={() => router.back()} />
        <View style={styles.sideTools}>
          <RoundButton
            icon={flash === 'on' ? Zap : ZapOff}
            label={flash === 'on' ? 'Flash on' : 'Flash off'}
            onPress={() => setFlash((value) => (value === 'on' ? 'off' : 'on'))}
            active={flash === 'on'}
          />
          <RoundButton
            icon={RefreshCcw}
            label="Flip camera"
            onPress={() => setFacing((value) => (value === 'back' ? 'front' : 'back'))}
          />
        </View>
      </View>
      <View style={[styles.shutterRow, { paddingBottom: insets.bottom + space.xl }]}>
        <RoundButton icon={ImageIcon} label="Choose from gallery" onPress={fromGallery} />
        <Animated.View style={shutterStyle}>
          <Pressable onPress={capture} accessibilityRole="button" accessibilityLabel="Take snap" style={styles.shutterOuter}>
            {isTaking ? <ActivityIndicator color="#FFFFFF" /> : <View style={styles.shutterInner} />}
          </Pressable>
        </Animated.View>
        <View style={styles.round} />
      </View>
      {error ? <Text style={[type.meta, styles.error, styles.cameraError]}>{error}</Text> : null}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash, flashStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000000' },
  center: { alignItems: 'center', justifyContent: 'center', gap: space.md, paddingHorizontal: space.xl },
  centerText: { textAlign: 'center' },
  absoluteTop: { position: 'absolute', top: 0, left: 0, right: 0 },
  white: { color: '#FFFFFF' },
  dim: { color: 'rgba(255,255,255,0.75)' },
  permissionActions: { alignSelf: 'stretch', gap: space.xs, marginTop: space.md },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: space.md,
  },
  sideTools: { gap: space.sm },
  round: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundActive: { backgroundColor: '#FFFFFF' },
  shutterRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  shutterOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.35)' },
  captionBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '55%',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingVertical: 10,
    paddingHorizontal: space.md,
  },
  captionInput: { color: '#FFFFFF', fontFamily: fonts.medium, fontSize: 18, textAlign: 'center' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.md, gap: space.md },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: space.xs,
    padding: 6,
    paddingLeft: 12,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  timer: { height: 34, minWidth: 46, paddingHorizontal: 10, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  timerActive: { backgroundColor: '#FFFFFF' },
  sendPill: {
    height: 58,
    borderRadius: 29,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
  },
  error: { color: '#FF8A98', textAlign: 'center' },
  flash: { backgroundColor: '#FFFFFF' },
  cameraError: { position: 'absolute', left: space.md, right: space.md, bottom: 140 },
  sendSheet: { height: '75%' },
  list: { flex: 1 },
  target: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 8 },
  grow: { flex: 1 },
  box: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
