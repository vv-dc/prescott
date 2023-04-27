# @prescott/contract
Implementation of contracts for Prescott.\
Allows to replace core components of the Prescott server with a custom implementation.

## Contracts list
See `model` and `schema` for contract interfaces.

### Env
Creates an isolated controlled environment for every task. Should provide
functionality to compile the env, run the task within the env, collect logs and metric.

### Log
Stores and aggregates logs of the active task. Should recognize separate runs of the task
and be able to store and search logs.

### Metric
The same as logs, but for metrics. Should be able to handle any structure of the metrics.

## Configuration
Use **root** configuration file (see `@prescott/bootstrap`) to set up custom contract's implementation. 
Currently, Prescott provides two ways to accomplish it: `file` and `npm`.
As the name suggests you can provide a path to the file on FS or just the name of the corresponding `npm` package.

### NPM
If you use an `npm` package just provide its name and make sure to add it to Prescott like this:
```sh
yarn add my-amazing-package
```
**NOTE**: Prescott won't try to download the package. It should be here **BEFORE** the start of the server.

### File
In the case of `file`, the value should be relative to `$PRESCOTT_WORKDIR/contract`.\
Contacts loader uses `await import()` under the hood, so symlinks will be followed as well.\
**NOTE**: Prescott will exit with an error in case of using `../../` to go outside the `PRESCOTT_WORKDIR`.

## Implementation
The first requirement, your contract should implement the interface of Prescott's part you want to replace.
`@prescott/contract` provides up-to-date interfaces and schemas for every one of the contracts.
Make sure to **fully** implement it, as Prescott validates that provided implementation has all the
defined functions and accepts a correct number of arguments.

The second one, every contract should have default export with the `buildContract` function that returns the contract.
According to it, the minimal example of the contract's implementation is the following:\
**ESM**:
```ts
export default {
  buildContract: async () => ({
    init: async (opts?: ContractOpts) => {},
  }),
};
```
**CJS**:
```ts
module.exports = {
  buildContract: async () => ({
    init: async (opts?: ContractOpts) => {},
  }),
};
```
