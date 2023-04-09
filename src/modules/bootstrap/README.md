# @prescott/bootstrap
Implementation of root config loader for Prescott.
Bootstraps application according to provided configuration.

## How it works
Everything here is based on `workDir` variable which points to the working directory of the Prescott server.
This directory should have `config.json` file with basic server configuration and may have custom implementations
for contracts (`contract` dir). Also, contracts can use it to store some information like logs, metrics, etc.

The value of `workDir` is stored in `PRESCOTT_WORKDIR` environment variable. To make local development more convenient,
by default it refers to `src/workdir`. But in production instance, it will be probably `/var/log/prescott`.

## Configuration
By default, Prescott uses the following configuration:
```json
{
  "contract": {
    "env": {
      "type": "file",
      "key": "env-provider.ts"
    },
    "log": {
      "type": "file",
      "key": "log-provider.ts"
    },
    "metric": {
      "type": "file",
      "key": "metric-provider.ts"
    }
  }
}
```
For more details of contracts configuration see `README.md` for `@prescott/contract`.
