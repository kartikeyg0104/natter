/**
 * TabBar: a floating rounded bar with Inbox, Updates, Contacts and You, and a
 * raised gradient camera button in the middle.
 *
 * Motion:
 * - a tinted highlight slides (spring) under the selected tab
 * - the selected icon does a small bounce; labels fade between colours
 * - the camera button breathes with a soft glow ring
 * Inbox carries the unread count and Updates a dot for new statuses.
 */
import BookUser from 'lucide-react-native/icons/book-user';
import Camera from 'lucide-react-native/icons/camera';
import CircleDashed from 'lucide-react-native/icons/circle-dashed';
import CircleUser from 'lucide-react-native/icons/circle-user-round';
import Inbox from 'lucide-react-native/icons/inbox';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, shadow, space } from '../../constants/theme';
import { totalUnread } from '../../inbox/inboxLogic';
import { inboxStore } from '../../inbox/inboxStore';
import { useStore } from '../../hooks/useStore';
import { useTheme } from '../../hooks/useTheme';
import { featuresStore, statusStore } from '../../store/socialStores';
import { haptics } from '../../utils/haptics';
import { log } from '../../utils/logger';
import { CountBadge } from '../kit/CountBadge';
import { Gradient } from '../kit/Gradient';
import { Icon } from '../kit/Icon';
import { PressableScale } from '../kit/PressableScale';

const ICONS = { inbox: Inbox, updates: CircleDashed, contacts: BookUser, you: CircleUser };
const TITLES = { inbox: 'Inbox', updates: 'Updates', contacts: 'Contacts', you: 'You' };
const FAB = 58;
const SLIDE = { damping: 18, stiffness: 220, mass: 0.8 };
const PILL_INSET = 6;

function TabItem({ route, label, isActive, onPress, onLayout, badge, dot, colors }) {
  const bounce = useSharedValue(1);
  const active = useSharedValue(isActive ? 1 : 0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    active.set(withTiming(isActive ? 1 : 0, { duration: 220 }));
    if (isActive && !reduceMotion) {
      bounce.set(withSequence(withTiming(0.82, { duration: 90 }), withSpring(1, { damping: 7, stiffness: 260 })));
    }
  }, [isActive, active, bounce, reduceMotion]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bounce.get() }, { translateY: -2 * active.get() }],
  }));
  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(active.get(), [0, 1], [colors.textMuted, colors.accent]),
    opacity: 0.75 + 0.25 * active.get(),
  }));
  const tint = isActive ? colors.accent : colors.textFaint;

  return (
    <Pressable
      onPress={onPress}
      onLayout={onLayout}
      style={styles.tab}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={badge ? `${label}, ${badge} unread` : label}
    >
      <Animated.View style={[styles.iconWrap, iconStyle]}>
        <Icon as={ICONS[route.name] ?? Inbox} color={tint} size={22} />
        {badge ? <CountBadge count={badge} style={styles.badge} /> : null}
        {dot ? <View style={[styles.dot, { backgroundColor: colors.accent, borderColor: colors.card }]} /> : null}
      </Animated.View>
      <Animated.Text style={[styles.label, labelStyle]}>{label}</Animated.Text>
    </Pressable>
  );
}

function CameraButton({ colors }) {
  const pulse = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    pulse.set(withRepeat(withTiming(1, { duration: 1800 }), -1, false));
  }, [pulse, reduceMotion]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.45 * (1 - pulse.get()),
    transform: [{ scale: 1 + 0.45 * pulse.get() }],
  }));

  return (
    <View style={styles.fabSlot}>
      <Animated.View pointerEvents="none" style={[styles.glow, { backgroundColor: colors.accent }, glowStyle]} />
      <PressableScale
        onPress={() => {
          haptics.select();
          router.push('/snap');
        }}
        accessibilityLabel="Open camera"
        scaleTo={0.88}
      >
        <Gradient style={[styles.fab, { borderColor: colors.bg }]}>
          <Icon as={Camera} color="#FFFFFF" size={26} />
        </Gradient>
      </PressableScale>
    </View>
  );
}

/**
 * Rendered by Tabs as its tabBar.
 * @param {{ state: { index: number, routes: { key: string, name: string }[] },
 *   descriptors?: Record<string, { options: { title?: string } }>,
 *   navigateToTab: (routeKey: string) => void }} props
 */
export function TabBar({ state, descriptors, navigateToTab }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const unread = useStore(inboxStore, (inbox) => totalUnread(inbox.byChat).messages);
  const hasNewUpdates = useStore(statusStore, (s) => s.others.some((group) => !group.allViewed));
  const canSnap = useStore(featuresStore, (s) => s.features.includes('snaps'));
  const [layouts, setLayouts] = useState({});
  const pillX = useSharedValue(0);
  const pillWidth = useSharedValue(0);
  const pillReady = useSharedValue(0);

  const activeKey = state.routes[state.index]?.key;
  const activeLayout = layouts[activeKey];

  useEffect(() => {
    if (!activeLayout) return;
    const x = activeLayout.x + PILL_INSET;
    const width = activeLayout.width - PILL_INSET * 2;
    if (!pillReady.get()) {
      pillX.set(x);
      pillWidth.set(width);
      pillReady.set(withTiming(1, { duration: 200 }));
      return;
    }
    pillX.set(withSpring(x, SLIDE));
    pillWidth.set(withSpring(width, SLIDE));
  }, [activeLayout, pillX, pillWidth, pillReady]);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: pillReady.get(),
    width: pillWidth.get(),
    transform: [{ translateX: pillX.get() }],
  }));

  const half = Math.ceil(state.routes.length / 2);
  const item = (route, index) => {
    const label = descriptors?.[route.key]?.options?.title ?? TITLES[route.name] ?? route.name;
    const isActive = state.index === index;
    return (
      <TabItem
        key={route.key}
        route={route}
        label={label}
        isActive={isActive}
        colors={colors}
        badge={route.name === 'inbox' ? unread : 0}
        dot={route.name === 'updates' && hasNewUpdates}
        onLayout={(event) => {
          const { x, width } = event.nativeEvent.layout;
          setLayouts((current) =>
            current[route.key]?.x === x && current[route.key]?.width === width
              ? current
              : { ...current, [route.key]: { x, width } },
          );
        }}
        onPress={() => {
          if (isActive) return;
          haptics.tap();
          log.nav(`tab -> ${route.name}`);
          navigateToTab(route.key);
        }}
      />
    );
  };

  return (
    <View style={[styles.wrap, { backgroundColor: colors.bg, paddingBottom: Math.max(insets.bottom, space.sm) }]}>
      <View style={[styles.bar, { backgroundColor: colors.card }, shadow(2, colors.shadow)]} accessibilityRole="tablist">
        <Animated.View pointerEvents="none" style={[styles.pill, { backgroundColor: colors.accentSoft }, pillStyle]} />
        {state.routes.slice(0, half).map((route, index) => item(route, index))}
        {canSnap ? <CameraButton colors={colors} /> : null}
        {state.routes.slice(half).map((route, index) => item(route, index + half))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space.sm, paddingTop: space.xs },
  bar: { flexDirection: 'row', alignItems: 'center', borderRadius: 32, paddingVertical: 6, paddingHorizontal: 4 },
  pill: { position: 'absolute', top: 6, bottom: 6, left: 0, borderRadius: 24 },
  tab: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 6 },
  iconWrap: { width: 30, height: 28, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 13 },
  badge: { position: 'absolute', top: -6, right: -10 },
  dot: { position: 'absolute', top: 0, right: -2, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  fabSlot: { width: FAB + 12, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', top: -30, width: FAB, height: FAB, borderRadius: FAB / 2 },
  fab: {
    width: FAB,
    height: FAB,
    borderRadius: FAB / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -30,
    borderWidth: 4,
  },
});
