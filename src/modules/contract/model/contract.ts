export type ContractOpts = {
  workDir: string;
  [key: string]: unknown; // TODO: add types for every contract
};

export interface Contract {
  init: (opts: ContractOpts) => Promise<void>;
}

export interface ContractModule {
  buildContract(): Promise<Contract>;
}
