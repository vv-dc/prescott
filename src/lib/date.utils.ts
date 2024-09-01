// different knex DB adapters handle dates differently
export const parseDate = (value: number | string | Date): Date => {
  return new Date(value);
};
