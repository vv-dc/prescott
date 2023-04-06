export type ContractOpts = object;

export interface Contract {
  init: (opts?: ContractOpts) => Promise<void>;
}

export interface ContractModule {
  buildContract(): Promise<Contract>;
}
