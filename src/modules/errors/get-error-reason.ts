export const errorToReason = (err: unknown): string => {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === 'string') {
    return err;
  }
  return `Unknown error: ${err}`;
};
