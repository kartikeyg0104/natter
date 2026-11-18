import { filterPeople, findDirectChat, groupFormProblem, toggleId } from './people';

const users = [
  { id: 'u3', name: 'vikram' },
  { id: 'me', name: 'tara' },
  { id: 'u1', name: 'zara' },
  { id: 'u2', name: 'Ishaan' },
];

describe('filterPeople', () => {
  it('puts me first, then everyone alphabetically', () => {
    expect(filterPeople(users, '', 'me').map((u) => u.name)).toEqual([
      'tara',
      'Ishaan',
      'vikram',
      'zara',
    ]);
  });

  it('matches case-insensitively and ignores spaces around the query', () => {
    expect(filterPeople(users, ' IS ', 'me').map((u) => u.name)).toEqual(['Ishaan']);
  });

  it('does not change the input list', () => {
    filterPeople(users, '', 'me');
    expect(users[0].name).toBe('vikram');
  });
});

describe('findDirectChat', () => {
  const conversations = [
    { id: 'g', type: 'GROUP', participants_ids: ['me', 'u1'] },
    { id: 'd1', type: 'DM', participants_ids: ['u1', 'me'] },
    { id: 'd2', type: 'DM', participants_ids: ['me', 'u2'] },
  ];

  it('finds the DM with that person, never a group', () => {
    expect(findDirectChat(conversations, 'me', 'u1')?.id).toBe('d1');
    expect(findDirectChat(conversations, 'me', 'u3')).toBeUndefined();
  });
});

describe('toggleId', () => {
  it('adds and removes without mutating', () => {
    const ids = ['a'];
    expect(toggleId(ids, 'b')).toEqual(['a', 'b']);
    expect(toggleId(ids, 'a')).toEqual([]);
    expect(ids).toEqual(['a']);
  });
});

describe('groupFormProblem', () => {
  it('needs a name and two people', () => {
    expect(groupFormProblem('', ['a', 'b'])).toMatch(/name/);
    expect(groupFormProblem('study', ['a'])).toMatch(/2 people/);
    expect(groupFormProblem('x'.repeat(61), ['a', 'b'])).toMatch(/under/);
    expect(groupFormProblem(' study ', ['a', 'b'])).toBe('');
  });
});

describe('alphabetSections', () => {
  const { alphabetSections } = jest.requireActual('./people');
  it('groups by first letter, A-Z, with non-letters last', () => {
    const people = [
      { id: '1', name: 'ishaan' },
      { id: '2', name: '42bot' },
      { id: '3', name: 'noor' },
      { id: '4', name: 'Nia' },
    ];
    expect(alphabetSections(people).map((s) => [s.title, s.data.map((p) => p.id)])).toEqual([
      ['I', ['1']],
      ['N', ['3', '4']],
      ['#', ['2']],
    ]);
  });
});
