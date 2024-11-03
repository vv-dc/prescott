// different knex DB adapters handle dates differently
export const parseDate = (value: number | string | Date): Date => {
  if (value instanceof Date) return value;
  return new Date(value);
};
