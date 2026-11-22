/**
 * Diagnostics: the in-app developer panel. It slides up from the bottom as a
 * tall dark sheet over the dimmed app. A root overlay (not a Modal), mounted
 * once in the root layout.
 *
 * The section content mounts only after the sheet has landed, so the slide
 * never has to lay out a long list on every frame.
 *
 * Close: drag the header down, Android back, or the close button.
 * Sections along the bottom: Status, Flow, Network, Logs, Tools.
 */
import Activity from 'lucide-react-native/icons/activity';
import X from 'lucide-react-native/icons/x';
import { useEffect, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  FadeIn,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { durations, EASE_IN_OUT } from '../../constants/motion';
import { fonts, signal, space, type } from '../../constants/theme';
import { lastFinished, summarizeConnection } from '../../debug/connectionSummary';
import { closeDiagnostics, diagnosticsStore, setDiagnosticsTab } from '../../debug/diagnosticsStore';
import { networkStore } from '../../debug/networkStore';
import { checkServerLogs } from '../../debug/serverLogStore';
import { useServerLogs } from '../../hooks/useServerLogs';
import { useStore } from '../../hooks/useStore';
import { useTheme } from '../../hooks/useTheme';
import { sessionStore } from '../../store/sessionStore';
import { project } from '../../utils/fling';
import { Icon } from '../kit/Icon';
import { IconButton } from '../kit/IconButton';
import { KeyboardSpacer } from '../kit/KeyboardSpacer';
import { FlowPanel } from './FlowPanel';
import { DiagnosticsTabBar } from './DiagnosticsTabBar';
import { LogsPanel } from './LogsPanel';
import { NetworkPanel } from './NetworkPanel';
import { OverviewPanel } from './OverviewPanel';
import { ToolsPanel } from './ToolsPanel';

const RISE = { duration: 420, dampingRatio: 1 };
const DROP = { duration: 300, easing: EASE_IN_OUT };
const SCRIM_OPACITY = 0.5;
const CLOSE_DRAG = 140;
const LAND_GRACE_MS = 400;
const BODY_IN = FadeIn.duration(durations.base);

function TabBody({ tab, server }) {
  if (tab === 'network') return <NetworkPanel serverEntries={server.entries} />;
  if (tab === 'flow') return <FlowPanel server={server} />;
  if (tab === 'tools') return <ToolsPanel server={server} onRetryServer={checkServerLogs} />;
  if (tab === 'logs') return <LogsPanel server={server} onRetryServer={checkServerLogs} />;
  return <OverviewPanel server={server} />;
}

export function DiagnosticsSheet() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [rootHeight, setRootHeight] = useState(0);
  const screenHeight = rootHeight || windowHeight;
  const sheetHeight = screenHeight - insets.top - space.xs;
  const reduceMotion = useReducedMotion();
  const { isOpen, tab } = useStore(diagnosticsStore);
  const server = useServerLogs(isOpen);
  const baseUrl = useStore(sessionStore, (state) => state.baseUrl);
  const requests = useStore(networkStore, (state) => state.requests);

  const [isMounted, setIsMounted] = useState(isOpen);
  if (isOpen && !isMounted) setIsMounted(true);
  const [openCount, setOpenCount] = useState(0);
  const [lastOpen, setLastOpen] = useState(isOpen);
  if (isOpen !== lastOpen) {
    setLastOpen(isOpen);
    if (isOpen) setOpenCount(openCount + 1);
  }
  const [landedFor, setLandedFor] = useState(-1);
  const showContent = isOpen && landedFor === openCount;

  // 0 = fully up, sheetHeight = off screen
  const offset = useSharedValue(screenHeight);

  function finishClosing() {
    setIsMounted(false);
  }

  useEffect(() => {
    if (!isMounted) return undefined;
    if (!isOpen) {
      offset.set(
        withTiming(screenHeight, reduceMotion ? { duration: 0 } : DROP, (done) => {
          if (done) scheduleOnRN(finishClosing);
        }),
      );
      return undefined;
    }
    const opening = openCount;
    offset.set(
      reduceMotion
        ? withTiming(0, { duration: 0 }, (done) => {
            if (done) scheduleOnRN(setLandedFor, opening);
          })
        : withSpring(0, RISE, (done) => {
            if (done) scheduleOnRN(setLandedFor, opening);
          }),
    );
    const fallback = setTimeout(() => setLandedFor(opening), RISE.duration + LAND_GRACE_MS);
    return () => clearTimeout(fallback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isMounted, openCount]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      closeDiagnostics();
      return true;
    });
    return () => subscription.remove();
  }, [isOpen]);

  const dragDown = usePanGesture({
    enabled: showContent,
    activeOffsetY: [-10, 10],
    onUpdate: (event) => {
      'worklet';
      offset.set(Math.max(0, event.translationY));
    },
    onDeactivate: (event) => {
      'worklet';
      if (event.translationY + project(event.velocityY) > CLOSE_DRAG) {
        scheduleOnRN(closeDiagnostics);
      } else {
        offset.set(withSpring(0, { ...RISE, velocity: event.velocityY }));
      }
    },
  });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: offset.get() }] }));
  const scrimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(offset.get(), [0, screenHeight], [SCRIM_OPACITY, 0], Extrapolation.CLAMP),
  }));

  if (!isMounted) return null;

  const connection = summarizeConnection(baseUrl, lastFinished(requests));
  const toneColor = { ok: signal.mid, bad: colors.dangerOnPanel, idle: colors.textOnPanelMuted }[
    connection.tone
  ];
  const problems = requests.filter((row) => row.state === 'error').length;

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="box-none"
      onLayout={(event) => setRootHeight(event.nativeEvent.layout.height)}
    >
      <Animated.View style={[styles.scrim, scrimStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeDiagnostics} accessibilityLabel="Close Diagnostics" />
      </Animated.View>
      <Animated.View
        style={[styles.sheet, { height: sheetHeight, backgroundColor: colors.panel }, sheetStyle]}
        accessibilityViewIsModal
      >
        <GestureDetector gesture={dragDown}>
          <View style={styles.header}>
            <View style={[styles.handle, { backgroundColor: colors.panelRaised }]} />
            <View style={styles.titleRow}>
              <View style={[styles.mark, { backgroundColor: colors.accent }]}>
                <Icon as={Activity} color={colors.onAccent} size={18} />
              </View>
              <View style={styles.titleText}>
                <Text style={[type.heading, { color: colors.textOnPanel }]} accessibilityRole="header">
                  Diagnostics
                </Text>
                <View style={styles.status}>
                  <View style={[styles.dot, { backgroundColor: toneColor }]} />
                  <Text style={[styles.statusText, { color: colors.textOnPanelMuted }]} numberOfLines={1}>
                    {connection.text}
                  </Text>
                </View>
              </View>
              <IconButton
                icon={X}
                variant="panel"
                size={38}
                onPress={closeDiagnostics}
                accessibilityLabel="Close Diagnostics"
              />
            </View>
          </View>
        </GestureDetector>
        <View style={styles.body}>
          {showContent ? (
            <Animated.View key={tab} entering={BODY_IN} style={styles.fill}>
              <TabBody tab={tab} server={server} />
            </Animated.View>
          ) : null}
        </View>
        {showContent ? (
          <Animated.View entering={BODY_IN}>
            <DiagnosticsTabBar tab={tab} onChange={setDiagnosticsTab} problems={problems} />
          </Animated.View>
        ) : null}
        <KeyboardSpacer restingHeight={insets.bottom + 8} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000000' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    zIndex: 2000,
    elevation: 2000,
  },
  header: { paddingHorizontal: space.md, paddingTop: space.xs, paddingBottom: space.sm, gap: space.sm },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  mark: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  titleText: { flex: 1, gap: 2 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { flex: 1, fontFamily: fonts.mono, fontSize: 11 },
  body: { flex: 1, paddingHorizontal: space.md },
  fill: { flex: 1 },
});
