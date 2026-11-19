/**
 * Avatar picker: choose a ready-made illustrated avatar for your profile.
 * Pick a style, tap a character, preview it big, then "Use this avatar".
 * Everyone sees the same picture on their phone.
 */
import Check from 'lucide-react-native/icons/check';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ImageIcon from 'lucide-react-native/icons/image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { friendlyMessage } from '../src/api/ApiError';
import { showToast } from '../src/alerts/alertStore';
import { Avatar } from '../src/components/avatar/Avatar';
import { PRESET_SEEDS, PRESET_STYLES, parsePreset } from '../src/components/avatar/avatarArt';
import { Aurora } from '../src/components/kit/Aurora';
import { Button } from '../src/components/kit/Button';
import { Gradient } from '../src/components/kit/Gradient';
import { Icon } from '../src/components/kit/Icon';
import { IconButton } from '../src/components/kit/IconButton';
import { radius, shadow, space, type } from '../src/constants/theme';
import { useStore } from '../src/hooks/useStore';
import { useTheme } from '../src/hooks/useTheme';
import { meStore, saveMe } from '../src/store/socialStores';
import { haptics } from '../src/utils/haptics';

const COLUMNS = 3;

export default function AvatarPicker() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const me = useStore(meStore, (s) => s.me);
  const current = parsePreset(me?.avatarPreset);
  const [styleId, setStyleId] = useState(current?.style.id ?? PRESET_STYLES[0].id);
  const [picked, setPicked] = useState(me?.avatarPreset ?? null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const tile = Math.floor((Math.min(width, 520) - space.md * 2 - space.sm * (COLUMNS - 1)) / COLUMNS);

  async function save() {
    if (!picked) return;
    setStatus('loading');
    setError('');
    try {
      await saveMe({ avatar_preset: picked });
      setStatus('success');
      haptics.success();
      showToast({ title: 'Avatar updated', icon: 'user' });
      router.back();
    } catch (failure) {
      setStatus('idle');
      setError(friendlyMessage(failure));
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <Aurora height={360} />
      <View style={[styles.topBar, { paddingTop: insets.top + space.xxs }]}>
        <IconButton icon={ChevronLeft} accessibilityLabel="Back" onPress={() => router.back()} />
        <Text style={[type.heading, { color: colors.text }]} accessibilityRole="header">
          Choose your avatar
        </Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}>
        <View style={styles.preview}>
          <Gradient style={styles.previewRing}>
            <View style={[styles.previewInner, { backgroundColor: colors.bg }]}>
              <Animated.View key={picked ?? 'none'} entering={FadeIn.duration(220)}>
                <Avatar name={me?.name ?? ''} size={132} preset={picked} photoId={null} />
              </Animated.View>
            </View>
          </Gradient>
          <Text style={[type.meta, { color: colors.textMuted }]}>
            {picked ? 'Looking good. Save it to show it to everyone.' : 'Tap a character below.'}
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.styleRow}>
          {PRESET_STYLES.map((style) => {
            const isActive = style.id === styleId;
            return (
              <Pressable
                key={style.id}
                onPress={() => {
                  haptics.tap();
                  setStyleId(style.id);
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                style={[
                  styles.styleChip,
                  isActive
                    ? { backgroundColor: colors.text, borderColor: colors.text }
                    : { backgroundColor: colors.card, borderColor: colors.line },
                ]}
              >
                <Avatar name="" size={26} preset={`${style.id}:${PRESET_SEEDS[1]}`} photoId={null} />
                <Text style={[type.chip, { color: isActive ? colors.bg : colors.textMuted }]}>{style.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.grid}>
          {PRESET_SEEDS.map((seed) => {
            const preset = `${styleId}:${seed}`;
            const isPicked = preset === picked;
            return (
              <Pressable
                key={preset}
                onPress={() => {
                  haptics.select();
                  setPicked(preset);
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: isPicked }}
                accessibilityLabel={`Avatar ${seed}`}
                style={[
                  styles.tile,
                  { width: tile, height: tile + 18, backgroundColor: colors.card, borderColor: isPicked ? colors.accent : 'transparent' },
                  shadow(1, colors.shadow),
                ]}
              >
                <Avatar name={seed} size={tile - 30} preset={preset} photoId={null} />
                <Text style={[type.caption, { color: isPicked ? colors.accent : colors.textMuted }]}>{seed}</Text>
                {isPicked ? (
                  <View style={[styles.check, { backgroundColor: colors.accent }]}>
                    <Icon as={Check} color="#FFFFFF" size={12} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <Text style={[type.caption, styles.credit, { color: colors.textFaint }]}>
          Art via DiceBear. Adventurer by Lisa Wischofsky, Big Smile by Ashley Seo, Fun Emoji by Davis Uche
          and Micah by Micah Lanier (CC BY 4.0); Avataaars and Bottts by Pablo Stanley.
        </Text>
        <Pressable onPress={() => router.replace('/profile-edit')} accessibilityRole="button" style={styles.photoLink}>
          <Icon as={ImageIcon} color={colors.accent} size={18} />
          <Text style={[type.label, { color: colors.accent }]}>Use a photo instead</Text>
        </Pressable>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space.sm, backgroundColor: colors.card, borderTopColor: colors.line }]}>
        {error ? <Text style={[type.meta, { color: colors.danger }]}>{error}</Text> : null}
        <Button label="Use this avatar" icon={Check} status={status} disabled={!picked} onPress={save} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.xs, paddingBottom: space.xs },
  content: { paddingHorizontal: space.md, gap: space.lg },
  preview: { alignItems: 'center', gap: space.sm, paddingTop: space.xs },
  previewRing: { padding: 5, borderRadius: 999 },
  previewInner: { padding: 5, borderRadius: 999 },
  styleRow: { gap: space.xs },
  styleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    paddingLeft: 6,
    paddingRight: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: { borderRadius: radius.card, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', gap: 4 },
  check: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  credit: { textAlign: 'center', paddingHorizontal: space.md },
  photoLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs, padding: space.sm },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: space.md, gap: space.xs, borderTopWidth: StyleSheet.hairlineWidth, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet },
});
