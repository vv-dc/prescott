import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { compileFromFile, Options } from 'json-schema-to-typescript';
import { FileInfo } from '@bcherny/json-schema-ref-parser';
import { getDirectoryFilesSync } from '@lib/file.utils';
import { config, SCHEMAS_CONFIG } from '@config/config';

const buildLocalProtocolRefResolver =
  (localPathPrefix: string, protocolPrefix: string) =>
  (file: FileInfo): Promise<Buffer> => {
    const normalizedFileName = file.url.replace(protocolPrefix, '');
    const filePath = path.join(localPathPrefix, normalizedFileName);
    return fs.readFile(filePath);
  };

const buildJsonSchemaToTypeScriptOptions = (
  schemasPath: string,
  schemasIdPrefix: string
): Options => {
  return {
    bannerComment: '',
    format: false,
    additionalProperties: true,
    cwd: schemasPath,
    enableConstEnums: true,
    declareExternallyReferenced: true,
    ignoreMinAndMaxItems: false,
    maxItems: 20,
    strictIndexSignatures: false,
    style: {},
    unreachableDefinitions: false,
    unknownAny: true,
    $refOptions: {
      resolve: {
        file: false,
        http: false,
        schema: {
          canRead: (file: FileInfo): boolean =>
            file.url.startsWith(schemasIdPrefix),
          read: buildLocalProtocolRefResolver(schemasPath, schemasIdPrefix),
        },
        external: true,
      },
    },
  };
};

const compileAndSaveSchemas = async (
  toDirectory: string,
  options: Options
): Promise<number> => {
  const schemaFiles = getDirectoryFilesSync(options.cwd as string);

  const compilePromises = schemaFiles.map((schemaPath) =>
    compileSchema(schemaPath, options)
  );
  const compileEntries = await Promise.all(compilePromises);

  const writePromises = compileEntries.map(({ schemaName, tsContent }) =>
    writeTsContent(schemaName, tsContent, toDirectory)
  );
  await Promise.all(writePromises);

  return schemaFiles.length;
};

const compileSchema = async (
  schemaPath: string,
  options: Options
): Promise<{ schemaName: string; tsContent: string }> => {
  const tsContent = await compileFromFile(schemaPath, options);
  const { dir, name } = path.parse(schemaPath);
  const baseDir = path.relative(options.cwd as string, dir);
  const schemaName = path.join(baseDir, name);
  return { schemaName: schemaName, tsContent };
};

const writeTsContent = async (
  schemaName: string,
  tsContent: string,
  toDirectory: string
): Promise<void> => {
  const tsContentDir = path.join(toDirectory, path.dirname(schemaName));
  await fs.mkdir(tsContentDir, { recursive: true });

  const tsContentPath = path.join(toDirectory, `${schemaName}.ts`);
  await fs.writeFile(tsContentPath, tsContent, 'utf-8');
};

const { schemasIdPrefix, schemasPath, tsPath } = config[SCHEMAS_CONFIG];
const options = buildJsonSchemaToTypeScriptOptions(
  schemasPath,
  schemasIdPrefix
);
compileAndSaveSchemas(tsPath, options)
  .then((schemasNumber) => console.log(`Done for ${schemasNumber} schemas`))
  .catch((err) => console.error(err));
