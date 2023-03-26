import { readFileSync } from 'fs';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

import { config, SCHEMAS_CONFIG } from '@config/config';
import { getDirectoryFilesSync } from '@lib/file.utils';

const { schemasPath, schemasIdPrefix } = config[SCHEMAS_CONFIG];

const getPrescottSchema = function (
  this: FastifyInstance,
  schemaId: string
): unknown {
  const fullSchemaId = `${schemasIdPrefix}${schemaId}.json`;
  const schema = this.getSchema(fullSchemaId);
  if (!schema) {
    const reason = `getPrescottSchema: unable to resolve schemaId=${schemaId}`;
    throw new Error(reason);
  }
  return schema;
};

const schema: FastifyPluginAsync = async (fastify) => {
  const files = getDirectoryFilesSync(schemasPath);
  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    fastify.addSchema(JSON.parse(content));
  }
  fastify.decorate('getPrescottSchema', getPrescottSchema);
};

export default fp(schema, {
  name: 'schema',
  decorators: {
    fastify: ['getPrescottSchema'],
  },
});
