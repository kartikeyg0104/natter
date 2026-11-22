import {
  closeDiagnostics,
  closeRequest,
  DIAGNOSTICS_TABS,
  diagnosticsStore,
  openDiagnostics,
  openRequest,
  replayInFlow,
  setDiagnosticsTab,
  stopReplay,
} from './diagnosticsStore';

beforeEach(() => {
  diagnosticsStore.reset();
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

describe('diagnosticsStore', () => {
  it('opens on the overview tab, with the five technical tabs', () => {
    expect(DIAGNOSTICS_TABS).toEqual(['overview', 'flow', 'network', 'logs', 'tools']);
    openDiagnostics('profile');
    expect(diagnosticsStore.get()).toMatchObject({ isOpen: true, tab: 'overview' });
    closeDiagnostics();
    expect(diagnosticsStore.get().isOpen).toBe(false);
  });

  it('ignores unknown tabs', () => {
    setDiagnosticsTab('nope');
    expect(diagnosticsStore.get().tab).toBe('overview');
  });

  it('opens a request in network detail and closes it again', () => {
    openRequest('ab12');
    expect(diagnosticsStore.get()).toMatchObject({ tab: 'network', requestId: 'ab12' });
    closeRequest();
    expect(diagnosticsStore.get().requestId).toBeNull();
  });

  it('sends a request to the flow replay', () => {
    replayInFlow('ab12');
    expect(diagnosticsStore.get()).toMatchObject({ tab: 'flow', replayId: 'ab12' });
    stopReplay();
    expect(diagnosticsStore.get().replayId).toBeNull();
  });
});
