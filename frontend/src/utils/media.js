/**
 * media: getting files in and out of the phone.
 *   takePhoto()      camera, as base64 (like pickPhoto)
 *   pickDocument()   any file, as base64
 *   readAsBase64()   a local file uri (recording, picked file) as base64
 *   fileUrl()        the server's download address for a file, plus auth headers
 *   openFile()       downloads a file and opens the share / open-with sheet
 * Errors are thrown with a sentence the screen can show.
 */
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { buildAuthHeader } from '../api/authHeader';
import { IMAGE_QUALITY } from '../constants/config';
import { sessionStore } from '../store/sessionStore';
import { guessMimeType, uploadFileName } from './fileData';
import { log } from './logger';
import { joinUrl } from './serverUrl';

/** @param {string} uri */
export async function readAsBase64(uri) {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
      reader.onerror = () => reject(new Error('The file could not be read.'));
      reader.readAsDataURL(blob);
    });
  }
  return new File(uri).base64();
}

/** @returns {Promise<{ uri: string, data: string, mimeType: string, fileName: string } | null>} */
export async function takePhoto() {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new Error('Allow camera access in Settings to take a photo.');
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    base64: true,
    quality: IMAGE_QUALITY,
  });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  const fileName = uploadFileName(asset.fileName);
  return {
    uri: asset.uri,
    data: asset.base64 ?? (await readAsBase64(asset.uri)),
    mimeType: asset.mimeType ?? guessMimeType(fileName),
    fileName,
  };
}

/** @returns {Promise<{ uri: string, data: string, mimeType: string, fileName: string, size: number } | null>} */
export async function pickDocument() {
  const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  const data = asset.base64 ?? (await readAsBase64(asset.uri));
  log.app(`document picker: ${asset.name} (${asset.size ?? '?'} bytes)`);
  return {
    uri: asset.uri,
    data,
    mimeType: asset.mimeType || 'application/octet-stream',
    fileName: asset.name || 'document',
    size: asset.size ?? 0,
  };
}

/** @param {string} fileId */
export function fileUrl(fileId) {
  const { baseUrl, name, password } = sessionStore.get();
  return {
    uri: joinUrl(baseUrl, `/file/${encodeURIComponent(fileId)}/download`),
    headers: { Authorization: buildAuthHeader(name, password ?? '') },
  };
}

/**
 * @param {{ id: string, name?: string, mimeType?: string }} file
 */
export async function openFile(file) {
  const { uri, headers } = fileUrl(file.id);
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri, { headers })).blob();
    globalThis.open?.(URL.createObjectURL(blob), '_blank');
    return;
  }
  const safeName = (file.name || `file-${file.id}`).replace(/[^\w.-]+/g, '_');
  const target = new File(Paths.cache, `${file.id}-${safeName}`);
  if (!target.exists) await File.downloadFileAsync(uri, target, { headers });
  if (!(await Sharing.isAvailableAsync())) throw new Error('Opening files is not available on this device.');
  await Sharing.shareAsync(target.uri, { mimeType: file.mimeType, dialogTitle: file.name });
}

/** @param {string | undefined} mimeType */
export function isAudio(mimeType) {
  return Boolean(mimeType?.startsWith('audio/'));
}
