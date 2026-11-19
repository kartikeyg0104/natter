/**
 * SignOutSheet: confirms signing out. The username and server stay filled
 * in on the sign-in screen; the password is forgotten.
 */
import { StyleSheet, Text, View } from 'react-native';
import { space, type } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../kit/Button';
import { Sheet } from '../kit/Sheet';

/** @param {{ visible: boolean, onCancel: () => void, onConfirm: () => void }} props */
export function SignOutSheet({ visible, onCancel, onConfirm }) {
  const { colors } = useTheme();
  return (
    <Sheet visible={visible} onClose={onCancel}>
      <View style={styles.text}>
        <Text style={[type.heading, { color: colors.text }]}>Sign out of Natter?</Text>
        <Text style={[type.body, { color: colors.textMuted }]}>
          Your username and server stay filled in. You will need your password to sign back in.
        </Text>
      </View>
      <View style={styles.actions}>
        <Button label="Sign out" variant="danger" onPress={onConfirm} />
        <Button label="Cancel" variant="secondary" onPress={onCancel} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  text: { gap: space.xs },
  actions: { gap: space.xs, marginTop: space.xs },
});
