import { readFileSync } from 'fs';
import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

import { config, SCHEMAS_CONFIG } from '@config/config';
import { getDirectoryFilesSync } from '@lib/file.utils';

const { schemasPath } = config[SCHEMAS_CONFIG];

const schema: FastifyPluginAsync = async (fastify) => {
  const files = getDirectoryFilesSync(schemasPath);
  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    fastify.addSchema(JSON.parse(content));
  }
};

export default fp(schema, { name: 'schema' });
