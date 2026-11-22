/**
 * DiagnosticsLayer: everything the root layout needs for debugging, in one
 * place: the floating orb (Profile > show debug orb), shake to open
 * (Profile > shake to open) and Diagnostics sheet itself.
 */
import { diagnosticsStore, openDiagnostics } from '../../debug/diagnosticsStore';
import { useShakeToOpen } from '../../hooks/useShakeToOpen';
import { useStore } from '../../hooks/useStore';
import { settingsStore } from '../../store/settingsStore';
import { DiagnosticsShortcut } from './DiagnosticsShortcut';
import { DiagnosticsSheet } from './DiagnosticsSheet';

const openFromShake = () => openDiagnostics('shake');

export function DiagnosticsLayer() {
  const showOrb = useStore(settingsStore, (state) => state.showOrb);
  const shakeToOpen = useStore(settingsStore, (state) => state.shakeToOpen);
  const isOpen = useStore(diagnosticsStore, (state) => state.isOpen);

  useShakeToOpen(shakeToOpen && !isOpen, openFromShake);

  return (
    <>
      {showOrb && !isOpen ? <DiagnosticsShortcut /> : null}
      <DiagnosticsSheet />
    </>
  );
}
