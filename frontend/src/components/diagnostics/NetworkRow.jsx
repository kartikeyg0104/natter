/**
 * NetworkRow: one request in the network list, devtools style: method, path, status, time and a waterfall bar on a shared
 * time axis; the plain sentence under the path. Tap opens the request detail.
 */
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { signal } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { describeRow } from '../../debug/describeRequest';

const BAR_WIDTH = 56;

/**
 * @param {object} props
 * @param {object} props.row networkStore row
 * @param {{ left: number, width: number } | undefined} props.bar waterfall position (0..1)
 * @param {(id: string) => void} props.onOpen
 */
function NetworkRowView({ row, bar, onOpen }) {
  const { colors } = useTheme();
  const isError = row.state === 'error';
  const isPending = row.state === 'pending';
  
  const statusColor = isError
    ? colors.dangerOnPanel
    : isPending
      ? colors.textOnPanelMuted
      : signal.mid;
  
  const methodColor = row.method === 'GET' 
    ? signal.cool 
    : row.method === 'POST'
      ? signal.violet
      : row.method === 'DELETE'
        ? colors.dangerOnPanel
        : signal.warm;
  
  const status = isPending ? '...' : isError ? (row.status ?? 'ERR') : row.status;
  const time =
    row.durationMs === undefined
      ? ''
      : row.durationMs >= 1000
        ? `${(row.durationMs / 1000).toFixed(1)}s`
        : `${row.durationMs}ms`;

  return (
    <Pressable
      onPress={() => onOpen(row.id)}
      style={({ pressed }) => [
        styles.row, 
        { 
          backgroundColor: pressed 
            ? 'rgba(140,155,255,0.08)' 
            : 'rgba(140,155,255,0.03)',
          borderLeftWidth: 3,
          borderLeftColor: methodColor,
        }
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${describeRow(row)}, ${status}, ${time}. Open details`}
    >
      <Text style={[styles.method, { color: methodColor }]}>
        {row.method}
      </Text>
      <View style={styles.main}>
        <Text style={[styles.path, { color: colors.textOnPanel }]} numberOfLines={1}>
          {row.path}
          {row.isPoll ? <Text style={{ color: colors.textOnPanelMuted }}> [poll]</Text> : null}
        </Text>
        <Text style={[styles.phrase, { color: colors.textOnPanelMuted }]} numberOfLines={1}>
          {describeRow(row)}
        </Text>
      </View>
      <View style={styles.numbers}>
        <Text style={[styles.status, { color: statusColor }]}>{status}</Text>
        <Text style={[styles.time, { color: colors.textOnPanelMuted }]}>{time}</Text>
      </View>
      <View style={[styles.track, { backgroundColor: 'rgba(255, 255, 255, 0.05)' }]}>
        {bar ? (
          <View
            style={[
              styles.bar,
              {
                left: bar.left * BAR_WIDTH,
                width: Math.max(2, bar.width * BAR_WIDTH),
                backgroundColor: statusColor,
              },
            ]}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

export const NetworkRow = memo(NetworkRowView);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    paddingLeft: 10,
    borderRadius: 8,
    marginVertical: 2,
  },
  method: { 
    width: 48, 
    fontFamily: 'DMSans_700Bold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  main: { flex: 1, gap: 3 },
  path: { 
    fontFamily: 'monospace',
    fontSize: 12,
    letterSpacing: 0.3,
  },
  phrase: { 
    fontFamily: 'monospace',
    fontSize: 11,
    letterSpacing: 0.2,
  },
  numbers: { alignItems: 'flex-end', gap: 3, minWidth: 48 },
  status: { 
    fontFamily: 'DMSans_700Bold',
    fontSize: 12,
  },
  time: { 
    fontFamily: 'monospace',
    fontSize: 10,
    letterSpacing: 0.3,
  },
  track: { 
    width: BAR_WIDTH, 
    height: 6, 
    borderRadius: 3, 
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  bar: { 
    position: 'absolute', 
    top: 0, 
    bottom: 0, 
    borderRadius: 2,
    elevation: 2,
  },
});
