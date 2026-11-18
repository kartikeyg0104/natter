/**
 * Sign in: choose a server, then a username and password. A new username
 * creates an account on that server the first time it signs in.
 */
import KeyRound from 'lucide-react-native/icons/key-round';
import AtSign from 'lucide-react-native/icons/at-sign';
import Eye from 'lucide-react-native/icons/eye';
import EyeOff from 'lucide-react-native/icons/eye-off';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AvatarCloud } from '../src/components/brand/AvatarCloud';
import { Logo } from '../src/components/brand/Logo';
import { Aurora } from '../src/components/kit/Aurora';
import { Button } from '../src/components/kit/Button';
import { Icon } from '../src/components/kit/Icon';
import { TextField } from '../src/components/kit/TextField';
import { ServerChoice } from '../src/components/signin/ServerChoice';
import { BRAND, DEMO_PASSWORD, DEMO_USERS } from '../src/constants/brand';
import { radius, shadow, space, type } from '../src/constants/theme';
import { useLogin } from '../src/hooks/useLogin';
import { useTheme } from '../src/hooks/useTheme';

export default function SignIn() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const form = useLogin();
  const [showPassword, setShowPassword] = useState(false);

  const buttonStatus = form.status === 'loading' ? 'loading' : form.status === 'success' ? 'success' : 'idle';

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <Aurora height={420} />
      <KeyboardAwareScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
      >
        <Animated.View entering={FadeIn.duration(400)} style={styles.brand}>
          <Logo size={52} />
          <Text style={[type.body, { color: colors.textMuted }]}>{BRAND.tagline}</Text>
        </Animated.View>

        <AvatarCloud />

        <View style={[styles.card, { backgroundColor: colors.card }, shadow(2, colors.shadow)]}>
          <ServerChoice
            mode={form.serverMode}
            onModeChange={form.chooseServer}
            customUrl={form.customUrl}
            onCustomUrlChange={form.editCustomUrl}
            error={form.errors.server}
          />

          <View style={[styles.rule, { backgroundColor: colors.line }]} />

          <TextField
            label="Username"
            value={form.name}
            onChangeText={form.setName}
            placeholder="e.g. zara"
            icon={AtSign}
            error={form.errors.name}
            inputProps={{
              autoCapitalize: 'none',
              autoComplete: 'username',
              textContentType: 'username',
              returnKeyType: 'next',
            }}
          />
          <TextField
            label="Password"
            value={form.password}
            onChangeText={form.setPassword}
            placeholder="Your password"
            icon={KeyRound}
            error={form.errors.password}
            trailing={
              <Pressable
                onPress={() => setShowPassword((value) => !value)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                <Icon as={showPassword ? EyeOff : Eye} color={colors.textFaint} size={19} />
              </Pressable>
            }
            inputProps={{
              secureTextEntry: !showPassword,
              autoCapitalize: 'none',
              autoComplete: 'password',
              textContentType: 'password',
              returnKeyType: 'go',
              onSubmitEditing: form.submit,
            }}
          />

          {form.errors.form ? (
            <View style={[styles.formError, { backgroundColor: colors.dangerSoft }]}>
              <Text style={[type.meta, { color: colors.danger }]}>{form.errors.form}</Text>
            </View>
          ) : null}

          <Button label="Sign in" onPress={form.submit} status={buttonStatus} />
          <Text style={[type.caption, styles.center, { color: colors.textFaint }]}>
            New here? Pick a username and password and your account is created.
          </Text>
        </View>

        <Text style={[type.caption, styles.center, { color: colors.textFaint }]}>
          Demo accounts: {DEMO_USERS.join(', ')} · password {DEMO_PASSWORD}
        </Text>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: space.md, gap: space.xl },
  brand: { gap: space.sm, paddingHorizontal: space.xxs },
  card: { borderRadius: radius.sheet, padding: space.lg, gap: space.md },
  rule: { height: StyleSheet.hairlineWidth },
  formError: { padding: space.sm, borderRadius: radius.field },
  center: { textAlign: 'center' },
});
