/**
 * TextField: a label above a bordered input. The border turns cobalt on
 * focus and red with a message underneath on error (the field shakes once).
 */
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { fonts, radius, space, type } from '../../constants/theme';
import { useShake } from '../../hooks/useShake';
import { useTheme } from '../../hooks/useTheme';
import { Icon } from './Icon';

/**
 * @param {object} props
 * @param {string} [props.label]
 * @param {string} props.value
 * @param {(text: string) => void} props.onChangeText
 * @param {string} [props.placeholder]
 * @param {import('react').ComponentType<any>} [props.icon]
 * @param {string} [props.error]
 * @param {import('react').ReactNode} [props.trailing] element at the right edge
 * @param {object} [props.inputProps] passed to TextInput
 */
export function TextField({ label, value, onChangeText, placeholder, icon, error, trailing, inputProps }) {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const { animatedStyle, shake } = useShake();

  useEffect(() => {
    if (error) shake();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  const borderColor = error ? colors.danger : isFocused ? colors.accent : colors.line;

  return (
    <View style={styles.wrap}>
      {label ? <Text style={[type.label, { color: colors.textMuted }]}>{label}</Text> : null}
      <Animated.View
        style={[
          styles.box,
          { backgroundColor: colors.card, borderColor, borderWidth: isFocused || error ? 1.5 : 1 },
          animatedStyle,
        ]}
      >
        {icon ? <Icon as={icon} color={isFocused ? colors.accent : colors.textFaint} size={19} /> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textFaint}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[styles.input, { color: colors.text }]}
          selectionColor={colors.accent}
          autoCorrect={false}
          accessibilityLabel={label ?? placeholder}
          {...inputProps}
        />
        {trailing}
      </Animated.View>
      {error ? (
        <Text style={[type.meta, { color: colors.danger }]} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  box: {
    minHeight: 52,
    borderRadius: radius.field,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
  },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 16, paddingVertical: 12 },
});
