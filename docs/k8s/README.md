# K8S integration

Kubernetes can be used to run tasks instead of Docker.

## How it works

Integration still uses Docker to build images, but runs them using K8s cluster instead of using `docker run`\

Steps are the following:

1. Build an image using default Docker builder
2. Load image to the registry or local cluster (`kind`)
3. Create a pod using provided image
4. Monitor the pod using K8S API

## Local development

All tests are using local cluster created by kind. There are only two requirements for the cluster:

1. It should have a name `prescott-test`
2. Metrics-server should be installed and running

To prepare such a cluster use the `prepare.sh` script\
To delete the cluster use `clean.sh` script
