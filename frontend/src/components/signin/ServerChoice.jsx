/**
 * ServerChoice: where to sign in. Two radio cards, "This computer" (found
 * automatically on the local network) and "Class server" (type an address,
 * then check it). A status pill shows whether the chosen server answers.
 */
import Globe from 'lucide-react-native/icons/globe';
import Laptop from 'lucide-react-native/icons/laptop';
import RefreshCw from 'lucide-react-native/icons/refresh-cw';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';
import { resolveBaseUrl } from '../../api/baseUrl';
import { riseIn } from '../../constants/motion';
import { radius, space, type } from '../../constants/theme';
import { useConnectionTest } from '../../hooks/useConnectionTest';
import { useTheme } from '../../hooks/useTheme';
import { haptics } from '../../utils/haptics';
import { Icon } from '../kit/Icon';
import { IconButton } from '../kit/IconButton';
import { StatusPill } from '../kit/StatusPill';
import { TextField } from '../kit/TextField';

const FIELD_IN = riseIn();

const OPTIONS = [
  { value: 'lan', label: 'This computer', hint: 'Found on your Wi-Fi', icon: Laptop },
  { value: 'custom', label: 'Class server', hint: 'Enter its address', icon: Globe },
];

/**
 * @param {object} props
 * @param {'lan' | 'custom'} props.mode
 * @param {(mode: 'lan' | 'custom') => void} props.onModeChange
 * @param {string} props.customUrl
 * @param {(url: string) => void} props.onCustomUrlChange
 * @param {string} [props.error]
 */
export function ServerChoice({ mode, onModeChange, customUrl, onCustomUrlChange, error }) {
  const { colors } = useTheme();
  const connection = useConnectionTest();
  const url = resolveBaseUrl(mode, customUrl);

  useEffect(() => {
    if (mode === 'lan') connection.check(resolveBaseUrl('lan', ''));
    else connection.reset();
    // Re-check only when the mode changes; a typed address waits for the button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const state = error ? 'fail' : connection.state;
  const reason = error || (connection.state === 'fail' ? connection.message : '');

  return (
    <View style={styles.wrap}>
      <View style={styles.headRow}>
        <Text style={[type.label, { color: colors.textMuted }]}>Server</Text>
        <StatusPill state={state} />
      </View>
      <View style={styles.cards} accessibilityRole="radiogroup">
        {OPTIONS.map((option) => {
          const isSelected = option.value === mode;
          return (
            <Pressable
              key={option.value}
              onPress={() => {
                if (isSelected) return;
                haptics.select();
                onModeChange(option.value);
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={option.label}
              style={[
                styles.card,
                {
                  backgroundColor: isSelected ? colors.accentSoft : colors.card,
                  borderColor: isSelected ? colors.accent : colors.line,
                },
              ]}
            >
              <Icon as={option.icon} color={isSelected ? colors.accent : colors.textMuted} size={20} />
              <Text style={[type.label, { color: isSelected ? colors.accent : colors.text }]}>
                {option.label}
              </Text>
              <Text style={[type.caption, { color: colors.textFaint }]}>{option.hint}</Text>
            </Pressable>
          );
        })}
      </View>
      {mode === 'custom' ? (
        <Animated.View entering={FIELD_IN} exiting={FadeOut} style={styles.customRow}>
          <View style={styles.grow}>
            <TextField
              value={customUrl}
              onChangeText={onCustomUrlChange}
              placeholder="e.g. 10.7.1.51"
              icon={Globe}
              inputProps={{ keyboardType: 'url', autoCapitalize: 'none', returnKeyType: 'done' }}
            />
          </View>
          <IconButton
            icon={RefreshCw}
            variant="tinted"
            size={50}
            accessibilityLabel="Check this server"
            onPress={() => connection.check(url)}
          />
        </Animated.View>
      ) : null}
      <Text style={[type.caption, { color: reason ? colors.danger : colors.textFaint }]} numberOfLines={2}>
        {reason || url || 'No address yet'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cards: { flexDirection: 'row', gap: space.xs },
  card: { flex: 1, gap: 4, padding: space.sm, borderRadius: radius.card - 6, borderWidth: 1.5 },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  grow: { flex: 1 },
});
