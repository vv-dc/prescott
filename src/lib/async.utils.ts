export const asyncGeneratorToArray = async <T>(
  generator: AsyncGenerator<T>
): Promise<T[]> => {
  const array = [] as T[];
  for await (const item of generator) {
    array.push(item);
  }
  return array;
};
