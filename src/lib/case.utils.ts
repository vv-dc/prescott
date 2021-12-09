export const snakeCaseToCamelCase = (str: string): string =>
  str
    .toLowerCase()
    .replace(/[-_][a-z]/g, (group) => group.slice(-1).toUpperCase());

export const camelCaseToSnakeCase = (str: string): string =>
  str.replace(/[A-Z]/g, (chr) => `_${chr.toLowerCase()}`);

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export const objectToCamelCase = (obj: any): any => {
  if (Array.isArray(obj)) return obj.map(objectToCamelCase);

  return obj !== undefined && obj !== null && obj.constructor === Object
    ? Object.keys(obj).reduce(
        (result, key) => ({
          ...result,
          [snakeCaseToCamelCase(key)]: objectToCamelCase(obj[key]),
        }),
        {}
      )
    : obj;
};
