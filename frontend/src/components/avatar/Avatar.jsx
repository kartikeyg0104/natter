/**
 * Avatar: a person's squircle tile. Their profile photo when they set one;
 * otherwise generated art in the style picked on the You tab (monogram by
 * default). Memoised because lists draw many.
 */
import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SvgAst } from 'react-native-svg';
import { AVATAR_CORNER, fonts } from '../../constants/theme';
import { useStore } from '../../hooks/useStore';
import { settingsStore } from '../../store/settingsStore';
import { directoryStore } from '../../store/directoryStore';
import { useFileImage } from '../../hooks/useFileImage';
import { avatarTree, backdropFor, initials, presetTree, swatchFor } from './avatarArt';

/**
 * @param {object} props
 * @param {string} props.name username, the seed
 * @param {number} [props.size=44]
 * @param {string} [props.styleId] overrides the chosen style (used by the picker)
 * @param {string} [props.ringColor] a 2 px outline, for overlapping stacks
 * @param {string | null} [props.photoId] a specific photo (file id); null forces generated art
 * @param {string | null} [props.preset] a specific preloaded avatar ("style:seed"); null ignores theirs
 */
function AvatarBase({ name, size = 44, styleId, ringColor, photoId, preset }) {
  const chosen = useStore(settingsStore, (state) => state.avatarStyle);
  const knownPhoto = useStore(directoryStore, (state) => state.avatarByName[name] ?? null);
  const knownPreset = useStore(directoryStore, (state) => state.presetByName?.[name] ?? null);
  const fileId = photoId === undefined ? knownPhoto : photoId;
  const presetId = preset === undefined ? (photoId === undefined ? knownPreset : null) : preset;
  const photo = useFileImage(fileId);
  const style = styleId ?? chosen;
  const tree = (presetId ? presetTree(presetId) : null) ?? avatarTree(name, style);
  const swatch = swatchFor(name);
  const shape = {
    width: size,
    height: size,
    borderRadius: Math.round(size * AVATAR_CORNER),
    backgroundColor: tree ? backdropFor(name) : swatch.bg,
  };

  return (
    <View
      style={[styles.tile, shape, ringColor ? { borderWidth: 2, borderColor: ringColor } : null]}
      accessibilityRole="image"
      accessibilityLabel={name ? `${name}'s picture` : 'picture'}
    >
      {fileId && photo.uri ? (
        <Image key={fileId} source={{ uri: photo.uri }} style={{ width: size, height: size }} contentFit="cover" />
      ) : tree ? (
        <SvgAst ast={tree} override={{ width: size, height: size }} />
      ) : (
        <Text
          style={[
            styles.letters,
            { color: swatch.fg, fontSize: Math.round(size * 0.38), lineHeight: Math.round(size * 0.46) },
          ]}
          allowFontScaling={false}
        >
          {initials(name)}
        </Text>
      )}
    </View>
  );
}

export const Avatar = memo(AvatarBase);

const styles = StyleSheet.create({
  tile: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  letters: { fontFamily: fonts.display, letterSpacing: -0.5 },
});
