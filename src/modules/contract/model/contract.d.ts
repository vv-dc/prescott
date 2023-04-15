export type ContractOpts = {
  workDir: string;
  [key: string]: unknown;
};

export interface Contract {
  init: (opts: ContractOpts) => Promise<void>;
}

export interface ContractModule {
  buildContract(): Promise<Contract>;
}
