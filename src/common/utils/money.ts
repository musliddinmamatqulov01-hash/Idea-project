/**
 * All money is stored as BigInt minor units (cents). Never use floating point
 * for financial values — Prisma maps these to `bigint`, serialized as string.
 */
export function toMinorUnits(major: number): bigint {
  return BigInt(Math.round(major * 100));
}

export function toMajorUnits(minor: bigint): number {
  return Number(minor) / 100;
}

export function serializeMoney(minor: bigint, currency: string) {
  return { amountMinor: minor.toString(), currency, amount: toMajorUnits(minor) };
}
