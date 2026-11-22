/**
 * LogRow: one log line, readable first:
 *
 *   [icon] sent a message · ok 201 · 84 ms                 3 s ago
 *          POST /message #ab12
 *
 * The plain sentence, then the technical detail small under it. Tapping opens
 * the exact time, "follow this request" (filters app and server lines by the
 * shared id) and "open in network" (the request's devtools view). Server
 * lines keep the backend's own wording.
 */
import Activity from 'lucide-react-native/icons/activity';
import ArrowLeftRight from 'lucide-react-native/icons/arrow-left-right';
import CircleDot from 'lucide-react-native/icons/circle-dot';
import Compass from 'lucide-react-native/icons/compass';
import RefreshCw from 'lucide-react-native/icons/refresh-cw';
import Server from 'lucide-react-native/icons/server';
import Smartphone from 'lucide-react-native/icons/smartphone';
import { memo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { signal } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { formatAgo, formatLogTime } from '../../utils/format';
import { openRequest } from '../../debug/diagnosticsStore';
import { Icon } from '../kit/Icon';

const CATEGORY_ICONS = {
  API: ArrowLeftRight,
  POLL: RefreshCw,
  NAV: Compass,
  STATE: CircleDot,
  APP: Smartphone,
};
const ICON_SIZE = 13;

function iconFor(entry) {
  if (entry.source === 'server') return Server;
  return CATEGORY_ICONS[entry.category] ?? Activity;
}

/**
 * @param {object} props
 * @param {object} props.entry
 * @param {number} props.now for the "3 s ago" label
 * @param {(requestId: string) => void} props.onPickRequest
 */
function LogRowView({ entry, now, onPickRequest }) {
  const { colors } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const isServer = entry.source === 'server';
  const id = entry.requestId;
  
  // Use neon colors based on level
  const levelColors = {
    error: colors.dangerOnPanel,
    warn: signal.warm,
    info: signal.cool,
    debug: colors.textOnPanelMuted,
  };
  
  const tone = entry.pending 
    ? colors.textOnPanelMuted 
    : levelColors[entry.level] || colors.textOnPanel;
  
  const serverColor = signal.violet;

  return (
    <Pressable
      onPress={() => setIsOpen(!isOpen)}
      accessibilityRole="button"
      accessibilityLabel={`${entry.message}. ${isOpen ? 'Hide' : 'Show'} details`}
      style={[styles.row, { 
        backgroundColor: isOpen ? 'rgba(140,155,255,0.05)' : 'transparent',
        borderLeftWidth: 2,
        borderLeftColor: isServer ? serverColor : tone,
      }]}
    >
      <View style={styles.head}>
        <View style={styles.icon}>
          <Icon as={iconFor(entry)} color={isServer ? serverColor : tone} size={ICON_SIZE} />
        </View>
        <Text style={[styles.message, { color: tone }]} numberOfLines={isOpen ? undefined : 2}>
          {entry.message}
        </Text>
        <Text style={[styles.ago, { color: colors.textOnPanelMuted }]}>
          {formatAgo(entry.time, now)}
        </Text>
      </View>
      {entry.detail && !isOpen ? (
        <Text style={[styles.mono, styles.detailLine, { color: colors.textOnPanelMuted }]} numberOfLines={1}>
          {entry.detail}
        </Text>
      ) : null}
      {isOpen ? (
        <View style={styles.details}>
          <Text style={[styles.mono, { color: colors.textOnPanelMuted }]} selectable>
            {formatLogTime(entry.time)} {isServer ? 'server' : 'app'} {entry.category.toLowerCase()}
            {entry.detail ? `  ${entry.detail}` : id ? `  #${id}` : ''}
          </Text>
          {id ? (
            <Pressable
              onPress={() => onPickRequest(id)}
              accessibilityRole="button"
              accessibilityLabel={`Show only request ${id}`}
              hitSlop={8}
            >
              <Text style={[styles.follow, { color: signal.cool }]}>Follow this request</Text>
            </Pressable>
          ) : null}
          {id && entry.category === 'API' ? (
            <Pressable
              onPress={() => openRequest(id)}
              accessibilityRole="button"
              accessibilityLabel={`Open request ${id} in network`}
              hitSlop={8}
            >
              <Text style={[styles.follow, { color: signal.violet }]}>Open in Network</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

export const LogRow = memo(LogRowView);

const styles = StyleSheet.create({
  row: { 
    paddingVertical: 10, 
    paddingHorizontal: 12,
    paddingLeft: 10,
    marginVertical: 2,
    borderRadius: 6,
  },
  detailLine: { paddingLeft: ICON_SIZE + 8, paddingTop: 2 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  icon: { paddingTop: 2 },
  message: { 
    flex: 1, 
    fontFamily: 'monospace',
    fontSize: 12, 
    lineHeight: 18,
    letterSpacing: 0.3,
  },
  ago: { 
    fontFamily: 'monospace',
    fontSize: 10, 
    lineHeight: 18,
    letterSpacing: 0.5,
  },
  details: { paddingLeft: ICON_SIZE + 8, paddingTop: 6, gap: 6 },
  mono: { 
    fontFamily: 'monospace',
    fontSize: 10, 
    lineHeight: 16,
    letterSpacing: 0.3,
  },
  follow: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 12,
  },
});
