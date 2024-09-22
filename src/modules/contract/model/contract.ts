// TODO: make it generic + add validation schema to check opts before passing it to init
export type ContractOpts = Record<string, string | undefined>;

export interface ContractSystemOpts {
  workDir: string;
}

export type ContractInitOpts = {
  system: ContractSystemOpts;
  contract: ContractOpts;
};

export interface Contract {
  init: (opts: ContractInitOpts) => Promise<void>;
}

export interface ContractModule {
  buildContract(): Promise<Contract>;
}
