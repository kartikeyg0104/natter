/**
 * Thread: the inverted message list (newest at the bottom) with day
 * headings. Scrolling up loads older pages; while scrolled up, new messages
 * from others show a "jump to latest" button with the count.
 */
import ArrowDown from 'lucide-react-native/icons/arrow-down';
import Camera from 'lucide-react-native/icons/camera';
import TimerIcon from 'lucide-react-native/icons/timer';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { riseIn, softOut } from '../../constants/motion';
import { radius, shadow, space, type } from '../../constants/theme';
import { runPosition, startsDay } from '../../hooks/messageList';
import { useTheme } from '../../hooks/useTheme';
import { formatDay } from '../../utils/format';
import { Icon } from '../kit/Icon';
import { PressableScale } from '../kit/PressableScale';
import { Bubble } from './Bubble';

const NEAR_BOTTOM = 80;

/** "zara took a screenshot" -> "You took…" / "Zara (school) took…" (the name you saved). */
function systemText(message, myId, usersById) {
  const user = usersById[message.senderId];
  const username = user?.username ?? user?.name ?? '';
  const content = message.content ?? '';
  if (!username || !content.startsWith(username)) return content;
  const who = message.senderId === myId ? 'You' : user.name;
  return who + content.slice(username.length);
}
const JUMP_IN = riseIn();
const JUMP_OUT = softOut();

/**
 * @param {object} props
 * @param {object[]} props.messages newest first
 * @param {string} props.myId
 * @param {Record<string, { name: string }>} props.usersById
 * @param {boolean} props.isGroup
 * @param {boolean} props.hasOlder
 * @param {boolean} props.isLoadingOlder
 * @param {number} props.unseen
 * @param {() => void} props.onLoadOlder
 * @param {() => void} props.onSeen
 * @param {(message: object) => void} props.onLongPress
 * @param {(id: string) => void} props.onRetry
 * @param {(message: object, isMine: boolean) => import('react').ReactNode} [props.renderAttachment]
 * @param {number} [props.scrollToBottomSignal]
 * @param {(message: object, emoji: string) => void} [props.onReact]
 * @param {import('react').ReactNode} [props.header] shown above the newest message (typing)
 * @param {(message: object) => void} [props.onOpenSnap]
 */
export function Thread({
  messages,
  myId,
  usersById,
  isGroup,
  hasOlder,
  isLoadingOlder,
  unseen,
  onLoadOlder,
  onSeen,
  onLongPress,
  onRetry,
  renderAttachment,
  scrollToBottomSignal,
  onReact,
  header,
  onOpenSnap,
}) {
  const { colors } = useTheme();
  const listRef = useRef(null);
  const [isScrolledUp, setIsScrolledUp] = useState(false);

  useEffect(() => {
    if (!isScrolledUp && unseen > 0) onSeen();
  }, [isScrolledUp, unseen, onSeen]);

  useEffect(() => {
    if (scrollToBottomSignal) listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [scrollToBottomSignal]);

  function jumpToLatest() {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    onSeen();
  }

  const top = isLoadingOlder ? (
    <ActivityIndicator style={styles.top} color={colors.accent} />
  ) : !hasOlder && messages.length ? (
    <Text style={[type.caption, styles.top, { color: colors.textFaint }]}>
      This is the beginning of the conversation
    </Text>
  ) : null;

  const showJump = isScrolledUp && unseen > 0;

  return (
    <View style={styles.wrap}>
      <FlatList
        ref={listRef}
        data={messages}
        inverted
        keyExtractor={(message) => message.id}
        onEndReached={hasOlder ? onLoadOlder : undefined}
        onEndReachedThreshold={0.3}
        ListFooterComponent={top}
        ListHeaderComponent={header}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        onScroll={(event) => setIsScrolledUp(event.nativeEvent.contentOffset.y > NEAR_BOTTOM)}
        scrollEventThrottle={100}
        contentContainerStyle={styles.content}
        renderItem={({ item, index }) => {
          const isMine = item.senderId === myId;
          const { isLastInRun, isFirstInRun } = runPosition(messages, index);
          const isNewDay = startsDay(messages, index);
          return (
            <View>
              {isNewDay ? (
                <View style={styles.day}>
                  <View style={[styles.dayPill, { backgroundColor: colors.bgSunken }]}>
                    <Text style={[type.micro, { color: colors.textMuted }]}>{formatDay(item.createdAt)}</Text>
                  </View>
                </View>
              ) : null}
              {item.type === 'SYSTEM' ? (
                <View style={styles.system}>
                  <View style={[styles.systemPill, { backgroundColor: colors.bgSunken }]}>
                    <Icon as={item.systemKind === 'disappearing' ? TimerIcon : Camera} color={colors.textMuted} size={13} />
                    <Text style={[type.caption, { color: colors.textMuted }]}>
                      {systemText(item, myId, usersById)}
                    </Text>
                  </View>
                </View>
              ) : (
              <Bubble
                message={item}
                isMine={isMine}
                senderName={usersById[item.senderId]?.name ?? 'Unknown'}
                myId={myId}
                nameOf={(id) => usersById[id]?.name ?? 'Unknown'}
                onReact={onReact}
                onOpenSnap={onOpenSnap}
                showSenderName={isGroup && !isMine && (isFirstInRun || isNewDay)}
                isLastInRun={isLastInRun}
                onLongPress={onLongPress}
                onRetry={onRetry}
                attachment={renderAttachment?.(item, isMine)}
              />
              )}
            </View>
          );
        }}
      />
      {showJump ? (
        <Animated.View entering={JUMP_IN} exiting={JUMP_OUT} style={styles.jumpAnchor}>
          <PressableScale onPress={jumpToLatest} accessibilityLabel={`${unseen} new messages, jump to latest`}>
            <View style={[styles.jump, { backgroundColor: colors.card }, shadow(2, colors.shadow)]}>
              <Icon as={ArrowDown} color={colors.accent} size={18} />
              <View style={[styles.jumpCount, { backgroundColor: colors.highlight }]}>
                <Text style={[type.micro, { color: colors.onHighlight }]}>{unseen > 9 ? '9+' : unseen}</Text>
              </View>
            </View>
          </PressableScale>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  content: { paddingVertical: space.sm },
  top: { alignSelf: 'center', marginVertical: space.md },
  day: { alignItems: 'center', marginVertical: space.sm },
  dayPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  system: { alignItems: 'center', marginVertical: space.xs, paddingHorizontal: space.lg },
  systemPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  jumpAnchor: { position: 'absolute', right: space.md, bottom: space.md },
  jump: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  jumpCount: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export const THREAD_RADIUS = radius.card;
