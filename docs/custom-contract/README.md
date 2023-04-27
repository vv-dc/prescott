# Custom contract implementation
See `@prescott/contract` for a list of available contracts.

## Types
First of all, the process depends on the source of the contract. Now there are two of such: `'npm' | 'file'`.
As the name suggests you can provide a path to the file on FS or just the name of the corresponding `npm` package.\
**NOTE**: See `README.md` for `@prescott/contracts`

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
The value of the `opts` will be passed to the `init` function of the contract.\
**NOTE**: see `@prescott/bootstrap`.

## Docker
There is an example how you can set up `file` and `npm` contracts implementation in Prescott running inside Docker.\
**Dockerfile**
```dockerfile
FROM prescott:lts AS base

ARG PRESCOTT_WORKDIR=/var/log/prescott

COPY env-file-contract.ts $PRESCOTT_WORKDIR/contract/env-file-contract.ts
COPY config.json $PRESCOTT_WORKDIR/config.json

RUN yarn add log-npm-contract
```
**config.json**
```json
{
  "contract": {
    "env": {
      "type": "file",
      "key": "env-file-contract.ts"
    },
    "log": {
      "type": "npm",
      "key": "log-npm-contract"
    }
  }
}
```
