/**
 * Start route: the inbox when signed in, otherwise sign in. The root layout
 * keeps the splash screen up until the saved session has been read.
 */
import { Redirect } from 'expo-router';
import { useStore } from '../src/hooks/useStore';
import { sessionStore } from '../src/store/sessionStore';

export default function Index() {
  const status = useStore(sessionStore, (state) => state.status);
  return <Redirect href={status === 'signedIn' ? '/inbox' : '/sign-in'} />;
}
