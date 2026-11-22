/**
 * Snap viewer: opens a view-once photo full screen. A ring in the corner
 * counts down the seconds the sender chose; when it runs out (or you tap),
 * the snap closes and can't be opened again. Taking a screenshot tells the
 * chat. Params: id (message), conversationId, sender.
 */
import X from 'lucide-react-native/icons/x';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { friendlyMessage } from '../../src/api/ApiError';
import { openSnap } from '../../src/api/social';
import { Avatar } from '../../src/components/avatar/Avatar';
import { Icon } from '../../src/components/kit/Icon';
import { fonts, space, type } from '../../src/constants/theme';
import { useScreenshotAlert } from '../../src/hooks/useScreenshotAlert';
import { reportScreenshot } from '../../src/store/socialStores';
import { log } from '../../src/utils/logger';

const RING = 34;
const STROKE = 3.5;
const TICK_MS = 50;

function Countdown({ fraction, secondsLeft }) {
  const r = (RING - STROKE) / 2;
  const circumference = 2 * Math.PI * r;
  return (
    <View style={styles.ring} accessibilityLabel={`${secondsLeft} seconds left`}>
      <Svg width={RING} height={RING}>
        <Circle cx={RING / 2} cy={RING / 2} r={r} stroke="rgba(255,255,255,0.3)" strokeWidth={STROKE} fill="none" />
        <Circle
          cx={RING / 2}
          cy={RING / 2}
          r={r}
          stroke="#FFFFFF"
          strokeWidth={STROKE}
          fill="none"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={circumference * (1 - fraction)}
          strokeLinecap="round"
          transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
        />
      </Svg>
      <Text style={styles.ringText}>{secondsLeft}</Text>
    </View>
  );
}

export default function SnapView() {
  const { id, conversationId, sender } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [snap, setSnap] = useState(null);
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);

  useScreenshotAlert(() => reportScreenshot(String(conversationId ?? '')));

  useEffect(() => {
    let isActive = true;
    openSnap(String(id))
      .then((opened) => isActive && setSnap(opened))
      .catch((failure) => {
        log.warn(`snap ${id}: ${friendlyMessage(failure)}`);
        if (isActive) setError(failure?.status === 410 ? 'This snap was already opened.' : friendlyMessage(failure));
      });
    return () => {
      isActive = false;
    };
  }, [id]);

  const total = (snap?.viewSeconds ?? 10) * 1000;

  useEffect(() => {
    if (!snap) return undefined;
    const timer = setInterval(() => setElapsed((value) => value + TICK_MS), TICK_MS);
    return () => clearInterval(timer);
  }, [snap]);

  useEffect(() => {
    if (snap && elapsed >= total) router.back();
  }, [elapsed, total, snap]);

  useEffect(() => {
    if (!error) return undefined;
    const timer = setTimeout(() => router.back(), 1800);
    return () => clearTimeout(timer);
  }, [error]);

  const senderName = String(sender ?? '');

  return (
    <Pressable style={styles.screen} onPress={() => router.back()} accessibilityLabel="Close snap">
      {snap ? (
        <Image source={{ uri: snap.data }} style={StyleSheet.absoluteFill} contentFit="contain" />
      ) : error ? (
        <View style={styles.center}>
          <Text style={[type.heading, styles.white]}>{error}</Text>
        </View>
      ) : (
        <View style={styles.center}>
          <ActivityIndicator color="#FFFFFF" size="large" />
        </View>
      )}
      {snap?.content ? (
        <View style={styles.captionBand} pointerEvents="none">
          <Text style={styles.caption}>{snap.content}</Text>
        </View>
      ) : null}
      <View style={[styles.top, { paddingTop: insets.top + space.xs }]} pointerEvents="box-none">
        <Avatar name={senderName} size={36} />
        <Text style={[type.label, styles.white, styles.grow]} numberOfLines={1}>
          {senderName}
        </Text>
        {snap ? (
          <Countdown
            fraction={Math.max(0, 1 - elapsed / total)}
            secondsLeft={Math.max(0, Math.ceil((total - elapsed) / 1000))}
          />
        ) : null}
        <Icon as={X} color="#FFFFFF" size={24} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  white: { color: '#FFFFFF' },
  grow: { flex: 1 },
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
  },
  ring: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center' },
  ringText: { position: 'absolute', color: '#FFFFFF', fontFamily: fonts.semibold, fontSize: 12 },
  captionBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '55%',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingVertical: 10,
    paddingHorizontal: space.md,
  },
  caption: { color: '#FFFFFF', fontFamily: fonts.medium, fontSize: 18, textAlign: 'center' },
});
