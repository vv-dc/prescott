import { prepareContract } from '@test/lib/test-contract.utils';
import envConfigProviderBuilder from '@src/workdir/contract/config/env-config-provider';
import { ConfigProviderContract } from '@modules/contract/model/config/config.contract';
import { generateRandomString } from '@lib/random.utils';

const buildConfigProvider = (): Promise<ConfigProviderContract> => {
  return prepareContract(envConfigProviderBuilder);
};

describe('env-config-provider integration', () => {
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
    const configProvider = await buildConfigProvider();
    const result = await configProvider.resolveValue(value);
    expect(result).toEqual(value);
  });

  it.each([
    ['42', '42'],
    ['abc-42', `abc-${generateRandomString()}`],
    ['foo-bar', '0'],
  ])('should resolve value - %s', async (value, expectedResult) => {
    const prefixedValue = `prescott-test-env-config-provider-${value}`;
    process.env[prefixedValue] = expectedResult;

    const configProvider = await buildConfigProvider();
    const result = await configProvider.resolveValue(`{{${prefixedValue}}}`);
    expect(result).toEqual(expectedResult);
  });

  it('should return null if value is not available', async () => {
    const configProvider = await buildConfigProvider();
    const value = generateRandomString(`SOME_NON_EXISTENT_ENV_VARIABLE`);
    const result = configProvider.resolveValueNullable(`{{${value}}}`);
    expect(result).toBeNull();
  });

  it('should throw if value is not available', async () => {
    const configProvider = await buildConfigProvider();
    const value = generateRandomString(`SOME_NON_EXISTENT_ENV_VARIABLE`);
    expect(() => {
      configProvider.resolveValue(`{{${value}}}`);
    }).toThrow(new Error(`Cannot resolve value='{{${value}}}'`));
  });
});
