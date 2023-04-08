import * as Joi from 'joi';
import { contractConfigSchema } from '@modules/contracts/schema/contract-config.schema';
import { RootConfigFile } from '@modules/bootstrap/model/root-config';

export const rootConfigFileSchema = Joi.object<RootConfigFile>({
  contract: contractConfigSchema,
});
