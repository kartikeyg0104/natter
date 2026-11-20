/**
 * Ticks: the delivery state of your own message.
 * sending = clock, sent = one tick, delivered = two ticks, read = two
 * marigold ticks, failed = alert icon. Drawn on the outgoing bubble.
 */
import Check from 'lucide-react-native/icons/check';
import CheckCheck from 'lucide-react-native/icons/check-check';
import CircleAlert from 'lucide-react-native/icons/circle-alert';
import Clock from 'lucide-react-native/icons/clock';
import { View } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Icon } from '../kit/Icon';

const SIZE = 13;
const LABELS = {
  sending: 'sending',
  sent: 'sent',
  delivered: 'delivered',
  read: 'read',
  failed: 'not sent',
};

/** @param {{ state: import('../../utils/ticks').TickState, onBubble?: boolean }} props */
export function Ticks({ state, onBubble = true }) {
  const { colors } = useTheme();
  const icon = {
    sending: Clock,
    sent: Check,
    delivered: CheckCheck,
    read: CheckCheck,
    failed: CircleAlert,
  }[state];
  const color =
    state === 'read'
      ? colors.highlight
      : state === 'failed'
        ? colors.danger
        : onBubble
          ? 'rgba(255,255,255,0.75)'
          : colors.textFaint;

  return (
    <View accessibilityLabel={LABELS[state]}>
      <Icon as={icon} color={color} size={SIZE} />
    </View>
  );
}
