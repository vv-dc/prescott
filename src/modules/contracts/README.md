# @prescott/contract

Implementation of contracts for Prescott.\
Allows to replace core components of the Prescott server with a custom implementation.

## Contracts list

See `src/model` and `src/schema` for contract interfaces.

### Env

Creates an isolated controlled environment for every task. Should provide
functionality to compile the env, run the task in it and collect logs and metric of it.

### Log

Stores and aggregates logs of the active task. Should recognize separate runs of the task
and be able to store and search logs.

### Metric

The same as logs, but for metrics. Should be able to handle any structure of the metrics.
