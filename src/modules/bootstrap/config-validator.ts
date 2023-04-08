import { RootConfigFile } from '@modules/bootstrap/model/root-config';
import { rootConfigFileSchema } from '@modules/bootstrap/schema/root-config.schema';

export const validateRootConfigFile = (
  configFile: RootConfigFile
): string | null => {
  const { error } = rootConfigFileSchema.validate(configFile);
  return error ? `Invalid root config: ${error.message}` : null;
};
