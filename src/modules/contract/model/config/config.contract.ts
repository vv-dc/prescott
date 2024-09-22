import { Contract } from '@modules/contract/model/contract';

export interface ConfigResolverContract extends Contract {
  /**
   * throws an error if the value is not available
   */
  resolveValue(value: string): Promise<string> | string;
  /**
   * returns null if the value is not available
   */
  resolveValueNullable(value: string): Promise<string | null> | string | null;
}
