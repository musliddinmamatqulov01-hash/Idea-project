import { StateMachine } from './state-machine';

type Status = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

describe('StateMachine', () => {
  const machine = new StateMachine<Status>({
    DRAFT: ['PUBLISHED'],
    PUBLISHED: ['ARCHIVED'],
    ARCHIVED: [],
  });

  it('allows a defined transition', () => {
    expect(machine.canTransition('DRAFT', 'PUBLISHED')).toBe(true);
  });

  it('rejects an undefined transition', () => {
    expect(machine.canTransition('DRAFT', 'ARCHIVED')).toBe(false);
  });

  it('rejects transitions out of a terminal state', () => {
    expect(machine.canTransition('ARCHIVED', 'DRAFT')).toBe(false);
  });

  it('throws on assertTransition for an invalid transition', () => {
    expect(() => machine.assertTransition('DRAFT', 'ARCHIVED')).toThrow(/Invalid state transition/);
  });

  it('does not throw on assertTransition for a valid transition', () => {
    expect(() => machine.assertTransition('DRAFT', 'PUBLISHED')).not.toThrow();
  });
});
