/**
 * AvatarCloud: a playful cluster of preloaded avatars for the sign-in
 * screen, popping in one after another, with little chat bubbles.
 */
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { fonts, shadow } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { Avatar } from '../avatar/Avatar';
import { Gradient } from '../kit/Gradient';

const PEOPLE = [
  { preset: 'adventurer:Nova', size: 64, x: 0, y: 26 },
  { preset: 'fun-emoji:Kai', size: 52, x: 70, y: 0 },
  { preset: 'big-smile:Luna', size: 76, x: 128, y: 30 },
  { preset: 'micah:Theo', size: 54, x: 214, y: 4 },
  { preset: 'avataaars:Aria', size: 62, x: 262, y: 44 },
];

export function AvatarCloud() {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {PEOPLE.map((person, index) => (
        <Animated.View
          key={person.preset}
          entering={FadeInDown.delay(150 + index * 90).duration(420)}
          style={[styles.face, { left: person.x, top: person.y }]}
        >
          <View style={[styles.ring, { backgroundColor: colors.card }, shadow(2, colors.shadow)]}>
            <Avatar name={person.preset} size={person.size} preset={person.preset} photoId={null} />
          </View>
        </Animated.View>
      ))}
      <Animated.View entering={FadeInDown.delay(650).duration(420)} style={[styles.bubble, { left: 40, top: 100 }]}>
        <Gradient style={styles.bubbleInner}>
          <Text style={styles.bubbleText}>lab at 4? 🧪</Text>
        </Gradient>
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(780).duration(420)} style={[styles.bubble, { left: 190, top: 118 }]}>
        <View style={[styles.bubbleInner, { backgroundColor: colors.card }, shadow(1, colors.shadow)]}>
          <Text style={[styles.bubbleText, { color: colors.text }]}>on my way 🔥</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 330, height: 156, alignSelf: 'center' },
  face: { position: 'absolute' },
  ring: { padding: 4, borderRadius: 999 },
  bubble: { position: 'absolute' },
  bubbleInner: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderBottomLeftRadius: 4 },
  bubbleText: { fontFamily: fonts.medium, fontSize: 13, color: '#FFFFFF' },
});
