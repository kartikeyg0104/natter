/**
 * useVoiceRecorder: record a voice note with expo-audio.
 *   start()   asks for the microphone, then records
 *   stop()    finishes and returns { data (base64), mimeType, fileName, seconds }
 *   cancel()  throws the recording away
 * `seconds` ticks while recording.
 */
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { log } from '../utils/logger';
import { readAsBase64 } from '../utils/media';

export function useVoiceRecorder() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const startedAt = useRef(0);

  useEffect(() => {
    if (!isRecording) return undefined;
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - startedAt.current) / 1000)), 250);
    return () => clearInterval(timer);
  }, [isRecording]);

  async function start() {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) throw new Error('Allow microphone access in Settings to record a voice message.');
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    startedAt.current = Date.now();
    setSeconds(0);
    setIsRecording(true);
    log.app('voice note: recording');
  }

  async function finish() {
    await recorder.stop();
    setIsRecording(false);
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
    return recorder.uri;
  }

  async function stop() {
    const elapsed = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
    const uri = await finish();
    if (!uri) throw new Error('The recording could not be saved.');
    const data = await readAsBase64(uri);
    const isWeb = Platform.OS === 'web';
    const extension = isWeb ? 'webm' : 'm4a';
    log.app(`voice note: ${elapsed} s`);
    return {
      data,
      mimeType: isWeb ? 'audio/webm' : 'audio/mp4',
      fileName: `voice-${Date.now()}.${extension}`,
      seconds: elapsed,
    };
  }

  async function cancel() {
    if (!isRecording) return;
    await finish().catch(() => {});
    log.app('voice note: cancelled');
  }

  return { isRecording, seconds, start, stop, cancel };
}
