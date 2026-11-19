/**
 * You: your profile card, how the app looks, which server you're on,
 * developer tools, and sign out.
 */
import { formatPhone } from '../../src/utils/phone';
import Activity from 'lucide-react-native/icons/activity';
import Archive from 'lucide-react-native/icons/archive';
import Ban from 'lucide-react-native/icons/ban';
import Pencil from 'lucide-react-native/icons/pencil';
import Smile from 'lucide-react-native/icons/smile';
import Star from 'lucide-react-native/icons/star';
import { router } from 'expo-router';
import Copy from 'lucide-react-native/icons/copy';
import LogOut from 'lucide-react-native/icons/log-out';
import Server from 'lucide-react-native/icons/server';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { notifyCopied } from '../../src/alerts/notify';
import { Avatar } from '../../src/components/avatar/Avatar';
import { Group } from '../../src/components/kit/Group';
import { Aurora } from '../../src/components/kit/Aurora';
import { Button } from '../../src/components/kit/Button';
import { Gradient } from '../../src/components/kit/Gradient';
import { Icon } from '../../src/components/kit/Icon';
import { ListRow } from '../../src/components/kit/ListRow';
import { Segmented } from '../../src/components/kit/Segmented';
import { StatusPill } from '../../src/components/kit/StatusPill';
import { Toggle } from '../../src/components/kit/Toggle';
import { AvatarStylePicker } from '../../src/components/you/AvatarStylePicker';
import { SignOutSheet } from '../../src/components/you/SignOutSheet';
import { BRAND } from '../../src/constants/brand';
import { radius, shadow, space, type } from '../../src/constants/theme';
import { openDiagnostics } from '../../src/debug/diagnosticsStore';
import { useConnectionTest } from '../../src/hooks/useConnectionTest';
import { useSession } from '../../src/hooks/useSession';
import { useStore } from '../../src/hooks/useStore';
import { useTheme } from '../../src/hooks/useTheme';
import { settingsStore, updateSettings } from '../../src/store/settingsStore';
import { blocksStore, featuresStore, meStore } from '../../src/store/socialStores';
import { haptics } from '../../src/utils/haptics';

const APPEARANCE = [
  { value: 'auto', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

function LeadIcon({ icon, tint, bg }) {
  return (
    <View style={[styles.leadIcon, { backgroundColor: bg }]}>
      <Icon as={icon} color={tint} size={18} />
    </View>
  );
}

export default function You() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const session = useSession();
  const settings = useStore(settingsStore);
  const connection = useConnectionTest();
  const [isConfirming, setIsConfirming] = useState(false);
  const userId = session.user?.id ?? '';
  const me = useStore(meStore, (s) => s.me);
  const features = useStore(featuresStore, (s) => s.features);
  const blockedCount = useStore(blocksStore, (s) => s.userIds.length);
  const has = (feature) => features.includes(feature);

  useEffect(() => {
    connection.check(session.baseUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.baseUrl]);

  async function copyId() {
    if (!userId) return;
    await Clipboard.setStringAsync(userId);
    haptics.success();
    notifyCopied();
  }

  function signOut() {
    setIsConfirming(false);
    haptics.success();
    session.signOut();
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <Aurora />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + space.sm }]}>
        <Text style={[type.title, { color: colors.text }]} accessibilityRole="header">
          You
        </Text>

        <View style={[styles.hero, { backgroundColor: colors.card }, shadow(1, colors.shadow)]}>
          <Gradient style={styles.banner}>
            <View style={styles.bannerBlobOne} />
            <View style={styles.bannerBlobTwo} />
          </Gradient>
          <Animated.View entering={ZoomIn.springify().damping(14)} style={[styles.heroAvatar, { backgroundColor: colors.card }]}>
            <Avatar
              name={session.name}
              size={104}
              photoId={has('profile') ? (me?.avatarFileId ?? null) : undefined}
              preset={has('profile') ? (me?.avatarFileId ? null : (me?.avatarPreset ?? null)) : undefined}
            />
          </Animated.View>
          <Text style={[type.title, styles.center, { color: colors.text }]} numberOfLines={1}>
            {session.name}
          </Text>
          {has('profile') ? (
            <Text style={[type.body, styles.center, { color: colors.textMuted }]} numberOfLines={1}>
              {me?.phoneNumber ? formatPhone(me.phoneNumber) : 'Add your phone number'}
            </Text>
          ) : null}
          {me?.about ? (
            <View style={[styles.aboutPill, { backgroundColor: colors.accentSoft }]}>
              <Text style={[type.chip, { color: colors.accent }]} numberOfLines={1}>
                {me.about}
              </Text>
            </View>
          ) : null}
          <Pressable
            onPress={copyId}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Copy your user ID"
            style={styles.idRow}
          >
            <Text style={[type.caption, { color: colors.textFaint }]} numberOfLines={1}>
              ID {userId ? `${userId.slice(0, 6)}…${userId.slice(-4)}` : 'unknown'}
            </Text>
            <Icon as={Copy} color={colors.textFaint} size={13} />
          </Pressable>
          {has('profile') ? (
            <View style={styles.heroActions}>
              <View style={styles.grow}>
                <Button label="Edit" icon={Pencil} variant="secondary" onPress={() => router.push('/profile-edit')} />
              </View>
              {has('avatar-presets') ? (
                <View style={styles.grow}>
                  <Button label="Avatars" icon={Smile} onPress={() => router.push('/avatar-picker')} />
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        {has('message-actions') || has('blocks') || has('chat-prefs') ? (
          <Group title="Chats">
            {has('message-actions') ? (
              <ListRow
                title="Starred messages"
                onPress={() => router.push('/starred')}
                leading={<LeadIcon icon={Star} tint={colors.accent} bg={colors.accentSoft} />}
              />
            ) : null}
            {has('chat-prefs') ? (
              <ListRow
                title="Archived chats"
                onPress={() => router.push('/archived')}
                leading={<LeadIcon icon={Archive} tint={colors.accent} bg={colors.accentSoft} />}
              />
            ) : null}
            {has('blocks') ? (
              <ListRow
                title="Blocked contacts"
                subtitle={blockedCount ? `${blockedCount} blocked` : 'None'}
                onPress={() => router.push('/blocked')}
                leading={<LeadIcon icon={Ban} tint={colors.accent} bg={colors.accentSoft} />}
              />
            ) : null}
          </Group>
        ) : null}

        <View style={styles.section}>
          <Text style={[type.label, styles.sectionTitle, { color: colors.textMuted }]}>Profile pictures</Text>
          <AvatarStylePicker
            name={session.name}
            value={settings.avatarStyle}
            onChange={(avatarStyle) => updateSettings({ avatarStyle })}
          />
        </View>

        <View style={styles.section}>
          <Text style={[type.label, styles.sectionTitle, { color: colors.textMuted }]}>Theme</Text>
          <Segmented
            options={APPEARANCE}
            value={settings.appearance}
            onChange={(appearance) => updateSettings({ appearance })}
          />
        </View>

        <Group title="Server" footer="Tap to check the connection again.">
          <ListRow
            title={session.serverMode === 'lan' ? 'This computer' : 'Class server'}
            subtitle={session.baseUrl}
            onPress={() => connection.check(session.baseUrl)}
            leading={<LeadIcon icon={Server} tint={colors.accent} bg={colors.accentSoft} />}
            trailing={<StatusPill state={connection.state} />}
          />
        </Group>

        <Group title="For developers">
          <ListRow
            title="Diagnostics"
            subtitle="Requests, logs and server tools"
            onPress={() => openDiagnostics('profile')}
            leading={<LeadIcon icon={Activity} tint={colors.accent} bg={colors.accentSoft} />}
          />
          <ListRow
            title="Floating shortcut"
            subtitle="A button on every screen that opens Diagnostics"
            trailing={
              <Toggle
                value={settings.showOrb}
                onChange={(showOrb) => updateSettings({ showOrb })}
                accessibilityLabel="Floating shortcut"
              />
            }
          />
          <ListRow
            title="Shake to open"
            subtitle="Shake the phone to open Diagnostics"
            trailing={
              <Toggle
                value={settings.shakeToOpen}
                onChange={(shakeToOpen) => updateSettings({ shakeToOpen })}
                accessibilityLabel="Shake to open"
              />
            }
          />
        </Group>

        <Group>
          <ListRow
            title="Sign out"
            tone="danger"
            onPress={() => setIsConfirming(true)}
            leading={<LeadIcon icon={LogOut} tint={colors.danger} bg={colors.dangerSoft} />}
          />
        </Group>

        <Text style={[type.caption, styles.version, { color: colors.textFaint }]}>
          {BRAND.name} {BRAND.version}
        </Text>
      </ScrollView>
      <SignOutSheet
        visible={isConfirming}
        onCancel={() => setIsConfirming(false)}
        onConfirm={signOut}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: space.md, paddingBottom: space.xxl, gap: space.lg },
  hero: { borderRadius: radius.card, alignItems: 'center', gap: 6, paddingBottom: space.md, overflow: 'hidden' },
  banner: { alignSelf: 'stretch', height: 96, overflow: 'hidden' },
  bannerBlobOne: { position: 'absolute', width: 160, height: 160, borderRadius: 80, top: -60, right: -30, backgroundColor: 'rgba(255,255,255,0.16)' },
  bannerBlobTwo: { position: 'absolute', width: 90, height: 90, borderRadius: 45, bottom: -40, left: 30, backgroundColor: 'rgba(255,201,60,0.35)' },
  heroAvatar: { marginTop: -58, padding: 5, borderRadius: 999 },
  center: { textAlign: 'center', paddingHorizontal: space.md },
  aboutPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, marginTop: 2 },
  heroActions: { flexDirection: 'row', gap: space.xs, alignSelf: 'stretch', paddingHorizontal: space.md, marginTop: space.xs },
  grow: { flex: 1 },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  section: { gap: 6 },
  sectionTitle: { paddingHorizontal: space.xxs },
  leadIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  version: { textAlign: 'center' },
});
