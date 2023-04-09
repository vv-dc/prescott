export type ContractOpts = Record<string, unknown>;

export interface Contract {
  init: (opts?: ContractOpts) => Promise<void>;
}

export interface ContractModule {
  buildContract(): Promise<Contract>;
}
