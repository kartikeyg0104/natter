/**
 * Banner: a card that drops in under the status bar for new messages,
 * failed sends, connection changes and short confirmations.
 *
 * Tap: open the chat (or retry a failed send). Swipe up or tap the close
 * button: dismiss. Long-press: open Diagnostics.
 */
import AlertTriangle from 'lucide-react-native/icons/triangle-alert';
import Check from 'lucide-react-native/icons/check';
import Copy from 'lucide-react-native/icons/copy';
import ImageIcon from 'lucide-react-native/icons/image';
import MessageSquare from 'lucide-react-native/icons/message-square-text';
import Star from 'lucide-react-native/icons/star';
import Trash2 from 'lucide-react-native/icons/trash-2';
import UserCheck from 'lucide-react-native/icons/user-check';
import Users from 'lucide-react-native/icons/users';
import Wifi from 'lucide-react-native/icons/wifi';
import WifiOff from 'lucide-react-native/icons/wifi-off';
import X from 'lucide-react-native/icons/x';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  SlideInUp,
  SlideOutUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { alertStore, clearToast, dismissAlert } from '../../alerts/alertStore';
import { frontAlert } from '../../alerts/alertQueue';
import { durations, EASE_OUT } from '../../constants/motion';
import { radius, shadow, space, type } from '../../constants/theme';
import { openDiagnostics } from '../../debug/diagnosticsStore';
import { useAlertFeeds } from '../../hooks/useAlertFeeds';
import { useStore } from '../../hooks/useStore';
import { useTheme } from '../../hooks/useTheme';
import { haptics } from '../../utils/haptics';
import { log } from '../../utils/logger';
import { Avatar } from '../avatar/Avatar';
import { Icon } from '../kit/Icon';

const IN = SlideInUp.duration(durations.sheet).easing(EASE_OUT);
const OUT = SlideOutUp.duration(durations.base);
const DISMISS_DRAG = -28;

const TOAST_ICONS = { copy: Copy, image: ImageIcon, user: UserCheck, group: Users, star: Star, trash: Trash2 };

function iconFor(alert) {
  if (alert.kind === 'failed') return AlertTriangle;
  if (alert.kind === 'connection') return alert.tone === 'success' ? Wifi : WifiOff;
  if (alert.kind === 'upload') return null;
  return MessageSquare;
}

export function Banner() {
  useAlertFeeds();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { alerts, toast } = useStore(alertStore);
  const { top, waiting } = frontAlert(alerts);
  const drag = useSharedValue(0);

  const current = toast ? { ...toast, key: `toast:${toast.id}`, kind: 'toast' } : top;

  function close() {
    if (!current) return;
    if (current.kind === 'toast') clearToast();
    else dismissAlert(current.key);
  }

  function press() {
    if (!current) return;
    if (current.kind === 'toast') {
      clearToast();
      return;
    }
    if (current.kind === 'failed') {
      current.onPress?.();
      dismissAlert(current.key);
      return;
    }
    if (current.chatId) {
      dismissAlert(current.key);
      log.nav(`banner -> chat/${current.chatId}`);
      router.push(`/chat/${current.chatId}`);
    }
  }

  const pan = usePanGesture({
    activeOffsetY: [-6, 6],
    onUpdate: (event) => {
      'worklet';
      drag.set(Math.min(0, event.translationY));
    },
    onDeactivate: (event) => {
      'worklet';
      if (event.translationY < DISMISS_DRAG || event.velocityY < -500) scheduleOnRN(close);
      drag.set(withTiming(0, { duration: durations.base }));
    },
  });

  const dragStyle = useAnimatedStyle(() => ({ transform: [{ translateY: drag.get() }] }));

  if (!current) return null;

  const tint =
    current.tone === 'danger' ? colors.danger : current.tone === 'warn' ? colors.warn : colors.accent;
  const isMessage = current.kind === 'message' || current.kind === 'newChat';
  const toastIcon = current.kind === 'toast' ? (TOAST_ICONS[current.icon] ?? Check) : null;
  const icon = toastIcon ?? iconFor(current);

  return (
    <View style={[styles.anchor, { top: insets.top + space.xs }]} pointerEvents="box-none">
      <GestureDetector gesture={pan}>
        <Animated.View key={current.key} entering={IN} exiting={OUT} style={dragStyle}>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.line },
              shadow(3, colors.shadow),
            ]}
          >
            <View style={[styles.stripe, { backgroundColor: tint }]} />
            <Pressable
              onPress={press}
              onLongPress={() => {
                haptics.select();
                openDiagnostics('banner');
              }}
              delayLongPress={450}
              accessibilityRole="button"
              accessibilityLabel={[current.title, current.detail].filter(Boolean).join(', ')}
              accessibilityHint={current.chatId ? 'Opens the chat' : undefined}
              style={styles.main}
            >
              {isMessage ? (
                <Avatar name={current.title} size={36} />
              ) : (
                <View style={[styles.iconTile, { backgroundColor: colors.accentSoft }]}>
                  {icon ? (
                    <Icon as={icon} color={tint} size={18} />
                  ) : (
                    <ActivityIndicator size="small" color={colors.accent} />
                  )}
                </View>
              )}
              <View style={styles.text}>
                <Text style={[type.label, { color: colors.text }]} numberOfLines={1}>
                  {current.title}
                  {current.count > 1 ? (
                    <Text style={{ color: colors.textFaint }}>{`  ${current.count} new`}</Text>
                  ) : null}
                </Text>
                {current.detail ? (
                  <Text style={[type.meta, { color: colors.textMuted }]} numberOfLines={1}>
                    {current.detail}
                  </Text>
                ) : null}
              </View>
              {waiting > 0 && current.kind !== 'toast' ? (
                <Text style={[type.micro, { color: colors.textFaint }]}>+{waiting}</Text>
              ) : null}
            </Pressable>
            {current.kind !== 'toast' ? (
              <Pressable
                onPress={close}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Dismiss"
                style={styles.close}
              >
                <Icon as={X} color={colors.textFaint} size={18} />
              </Pressable>
            ) : null}
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: { position: 'absolute', left: space.sm, right: space.sm, zIndex: 50 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
    paddingLeft: space.md,
  },
  close: { paddingHorizontal: space.md, paddingVertical: space.sm },
  stripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  iconTile: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 1 },
});
