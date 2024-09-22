import { prepareContract } from '@test/lib/test-contract.utils';
import envConfigResolverBuilder from '@src/workdir/contract/config/env-config-resolver';
import { ConfigResolverContract } from '@modules/contract/model/config/config.contract';
import { generateRandomString } from '@lib/random.utils';

const buildConfigResolver = (): Promise<ConfigResolverContract> => {
  return prepareContract(envConfigResolverBuilder);
};

describe('env-config-resolver integration', () => {
  it.each([
    '0',
    '42',
    'abc',
    '{abc-42}',
    '{{abc-42',
    '{abc-42}}',
    '{{abc-42}',
    '',
    'NaN',
    'null',
    'undefined',
  ])('should return unresolvable value directly - %s', async (value) => {
    const configResolver = await buildConfigResolver();
    const result = await configResolver.resolveValue(value);
    expect(result).toEqual(value);
  });

  it.each([
    ['42', '42'],
    ['abc-42', `abc-${generateRandomString()}`],
    ['foo-bar', '0'],
  ])('should resolve value - %s', async (value, expectedResult) => {
    const prefixedValue = `prescott-test-env-config-provider-${value}`;
    process.env[prefixedValue] = expectedResult;

    const configResolver = await buildConfigResolver();
    const result = await configResolver.resolveValue(`{{${prefixedValue}}}`);
    expect(result).toEqual(expectedResult);
  });

  it('should return null if value is not available', async () => {
    const configResolver = await buildConfigResolver();
    const value = generateRandomString(`SOME_NON_EXISTENT_ENV_VARIABLE`);
    const result = configResolver.resolveValueNullable(`{{${value}}}`);
    expect(result).toBeNull();
  });

  it('should throw if value is not available', async () => {
    const configResolver = await buildConfigResolver();
    const value = generateRandomString(`SOME_NON_EXISTENT_ENV_VARIABLE`);
    expect(() => {
      configResolver.resolveValue(`{{${value}}}`);
    }).toThrow(new Error(`Cannot resolve value='{{${value}}}'`));
  });
});
