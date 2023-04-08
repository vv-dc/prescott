# Custom contract implementation
The instructions below do not depend on the type of the contract.
See `@prescott/contract` for a list of available contracts.

## Types
First of all, the process depends on the source of the contract. Now there are two of such: `'npm' | 'file'`.
As the name suggests you can provide a path to the file on FS or just the name of the corresponding `npm` package.

### NPM
If you use an `npm` package just provide its name and make sure to add it to Prescott like this:
```sh
yarn add my-amazing-package
```
**NOTE**: Prescott won't try to download the package. It should be here **BEFORE** the start of the server.
**TODO**: Automatically install packages

### File
In the case of the `file,` the value should be relative to `$PRESCOTT_WORKDIR/contract`.
It may seem to be limiting, but `../../../` are allowed.

## Configuration
Before the start of the server, Prescott reads the root configuration file. It's a plain JSON file that is located at
`$PRESCOTT_WORKDIR/config.json`. Here you can provide an implementation as follows:

```json
{
  "contract": {
    "env": {
      "type": "npm",
      "key": "my-amazing-contract",
      "opts": {
        "key1": 1,
        "key2": 2,
        "key3": 3
      }
    }
  }
}
```

The value of the `opts` will be passed to the `init` function of the contract.

## Implementation
The first requirement, your contract should implement the interface Prescott's part you want to replace.
`@prescott/contract` provides up-to-date interfaces and schemas for every one of the contracts.
Make sure to **fully** implement it, as Prescott validates that your implementation has all the
needed functions and accepts a correct number of arguments.

The second one, every contract should have default export with the `buildContract` function that returns the contract.
According to it, the minimal example of the contract's implementation is the following:
ESM:
```ts
export default {
  buildContract: () => {
    init: async (opts?: ContractOpts) => {};
  },
};
```
In CJS:
```ts
module.exports = {
  buildContract: () => {
    init: async (opts?: ContractOpts) => {};
  },
};
```

## Docker (TBD)
There is an example how you can set up `file` and `npm` contracts implementation in Prescott running inside Docker.
```dockerfile
FROM prescott:latest AS base

ARG PRESCOTT_WORKDIR=/var/log/prescott

COPY env-file-contract.ts $PRESCOTT_WORKDIR/contract/env-file-contract.ts
COPY config.json $PRESCOTT_WORKDIR/config.json

RUN yarn add log-npm-contract
```
Fill `config.json` with the following
```json
{
  "contract": {
    "env": {
      "type": "file",
      "key": "env-file-contract.ts"
    },
    "log": {
      "type": "npm",
      "key": "log-npm-contract.ts"
    }
  }
}
```
