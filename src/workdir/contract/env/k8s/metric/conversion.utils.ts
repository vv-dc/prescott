const METRIC_SYSTEM_UNITS: Partial<Record<string, number>> = {
  n: 1_000_000_000,
  u: 1_000_000,
  m: 1_000,
};

export const convertDecimalValue = (sizeString: string): number => {
  const value = parseInt(sizeString, 10);
  const unit = sizeString.slice(`${sizeString}`.length); // Get the unit from the string
  const multiplier = METRIC_SYSTEM_UNITS[unit] ?? 1;
  return value * multiplier;
};

export const convertByteValue = (sizeString: string): number => {
  const sizes = ['Ki', 'Mi', 'Gi', 'Ti', 'Pi', 'Ei', 'Zi', 'Yi'];
  const value = parseInt(sizeString, 10);

  const size = sizeString.slice(`${value}`.length);
  if (size === '') return value; // just bytes

  const pow = sizes.findIndex((el) => el === size) + 1;
  if (pow === -1) return value;

  return value * Math.pow(1024, pow);
};
