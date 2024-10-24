export interface SchemasConfig {
  schemasPath: string;
  tsPath: string;
  schemasIdPrefix: string;
  ajvOptions: {
    allowUnionTypes: boolean;
  };
}
