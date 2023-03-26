import { Options as AjvOptions } from 'ajv/dist/core';

export interface SchemasConfig {
  schemasPath: string;
  tsPath: string;
  ajvOptions: AjvOptions;
}
