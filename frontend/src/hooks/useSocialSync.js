/**
 * useSocialSync: keeps the Natter extras fresh while signed in. Mounted once
 * at the root. Loads everything after sign in, then polls presence (typing,
 * online) often and the rest gently. Nothing runs on a basic server.
 */
import { useEffect } from 'react';
import { sessionStore } from '../store/sessionStore';
import {
  featuresStore,
  loadPeople,
  loadPrefs,
  loadSocial,
  loadStatus,
  loadStreaks,
  pollPresence,
} from '../store/socialStores';
import { usePolling } from './usePolling';
import { useStore } from './useStore';

const pollPeople = () => loadPeople({ isPoll: true });
const pollPrefs = () => loadPrefs({ isPoll: true });
const pollStatus = () => loadStatus({ isPoll: true });
const pollStreaks = () => loadStreaks({ isPoll: true });

export function useSocialSync() {
  const isSignedIn = useStore(sessionStore, (state) => state.status === 'signedIn');
  const userId = useStore(sessionStore, (state) => state.user?.id ?? '');
  const isReady = useStore(featuresStore, (state) => state.status === 'ready');

  useEffect(() => {
    if (isSignedIn) loadSocial();
  }, [isSignedIn, userId]);

  const active = isSignedIn && isReady;
  usePolling(pollPresence, 4000, active);
  usePolling(pollPeople, 30000, active);
  usePolling(pollPrefs, 15000, active);
  usePolling(pollStatus, 30000, active);
  usePolling(pollStreaks, 60000, active);
}
