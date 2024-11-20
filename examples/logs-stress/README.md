# Logs stress test

This example shows that automation server can effectively process large
amount of logs from multiple tasks running in parallel.

## How to use

1. Increase `maxConcurrency` for `queue` contract to 50
2. Create task using `task.json`

_Note_: This task replicates itself every second. Every execution generates
100 log entries every second. Total execution time is 5 minutes (300 seconds)

Base64 encoded script:

```sh
for i in $(seq 30000); do echo "hello-${i}"; sleep 0.01; done
```
