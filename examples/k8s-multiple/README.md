# K8s Multiple Clusters

This examples demonstrates that Prescott can commuinucate with multiple K8s clusters
at the same time.

## How to use

First setup the clusters:

```sh
up.sh
```

Then run the server:

```sh
yarn start:dev
```

After that create two tasks with different runners using the template from task.json

Encoded base64 script is:

```sh
for i in $(seq 100); do echo 'hello-${i}'; sleep 1; done
```
