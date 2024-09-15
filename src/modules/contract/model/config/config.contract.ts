import { Contract } from '@modules/contract/model/contract';

export interface ConfigProviderContract extends Contract {
  /**
   * throws an error if value is not available
   * @param value name of target parameter
   */
  resolveValue(value: string): Promise<string> | string;
  /**
   * returns null if value is not available
   * @param value target parameter
   */
  resolveValueNullable(value: string): Promise<string | null> | string | null;
}
