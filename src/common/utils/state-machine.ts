export class StateMachine<TState extends string> {
  constructor(private readonly transitions: Record<TState, TState[]>) {}

  canTransition(from: TState, to: TState): boolean {
    return this.transitions[from]?.includes(to) ?? false;
  }

  assertTransition(from: TState, to: TState): void {
    if (!this.canTransition(from, to)) {
      throw new Error(`Invalid state transition: ${from} -> ${to}`);
    }
  }
}
