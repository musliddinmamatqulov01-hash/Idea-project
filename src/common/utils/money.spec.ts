import { toMinorUnits, toMajorUnits, serializeMoney } from './money';

describe('money utils', () => {
  it('converts major units to minor (cent) units without float drift', () => {
    expect(toMinorUnits(45000)).toBe(4500000n);
    expect(toMinorUnits(19.99)).toBe(1999n);
    expect(toMinorUnits(0.1)).toBe(10n);
  });

  it('converts minor units back to major units', () => {
    expect(toMajorUnits(4500000n)).toBe(45000);
    expect(toMajorUnits(1999n)).toBeCloseTo(19.99);
  });

  it('serializes money with both minor-unit string and major amount', () => {
    expect(serializeMoney(4500000n, 'USD')).toEqual({
      amountMinor: '4500000',
      currency: 'USD',
      amount: 45000,
    });
  });
});
