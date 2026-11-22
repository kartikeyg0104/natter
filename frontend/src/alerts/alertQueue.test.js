import { expireAlerts, frontAlert, nextExpiry, removeAlert, sortAlerts, upsertAlert } from './alertQueue';

describe('alertQueue', () => {
  it('adds a new alert with timestamps', () => {
    const list = upsertAlert([], { key: 'a', kind: 'message', title: 'zara' }, 10);
    expect(list).toEqual([{ key: 'a', kind: 'message', title: 'zara', createdAt: 10, updatedAt: 10 }]);
  });

  it('updates an alert with the same key in place', () => {
    const first = upsertAlert([], { key: 'a', kind: 'message', count: 1 }, 10);
    const second = upsertAlert(first, { key: 'a', kind: 'message', count: 2 }, 20);
    expect(second).toHaveLength(1);
    expect(second[0]).toMatchObject({ count: 2, createdAt: 10, updatedAt: 20 });
  });

  it('removes by key', () => {
    expect(removeAlert([{ key: 'a' }, { key: 'b' }], 'a')).toEqual([{ key: 'b' }]);
  });

  it('expires alerts whose time is up and reports the next expiry', () => {
    const list = [{ key: 'a', expiresAt: 5 }, { key: 'b', expiresAt: 50 }, { key: 'c' }];
    expect(expireAlerts(list, 10).map((item) => item.key)).toEqual(['b', 'c']);
    expect(nextExpiry(list)).toBe(5);
    expect(nextExpiry([{ key: 'c' }])).toBeNull();
  });

  it('puts failures before messages and newer before older', () => {
    const list = [
      { key: 'm1', kind: 'message', updatedAt: 1 },
      { key: 'f', kind: 'failed', updatedAt: 0 },
      { key: 'm2', kind: 'message', updatedAt: 2 },
    ];
    expect(sortAlerts(list).map((item) => item.key)).toEqual(['f', 'm2', 'm1']);
    expect(frontAlert(list)).toMatchObject({ top: { key: 'f' }, waiting: 2 });
    expect(frontAlert([])).toEqual({ top: null, waiting: 0 });
  });
});
