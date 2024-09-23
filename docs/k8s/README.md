# K8S integration

Kubernetes can be used to run tasks instead of Docker.

## How it works

Integration still uses Docker to build images, but runs them using K8s cluster instead of using `docker run`\

Steps are the following:

1. Build an image using default Docker builder
2. Load image to the registry or local cluster (`kind`)
3. Create a pod using provided image
4. Monitor the pod using K8S API

## Set up the cluster
There are two ways to connect to cluster:
1. Kubeconfig (file on FS or raw string)
2. ServiceAccount (token + host of cluster)

### Kubeconfig
(1) Generate kubeconfig:
```shell
kind export kubeconfig --name '<cluster-name'> --kubeconfig '<directory-name>'
```
(2) Use it in `opts` of `envRunner` in one of two ways:
```json
{
  "opts": {
    "kubeConfig": "path to kubeconfig on FS",
    "kubeConfigString": "content of kubeconfig"
  }
}
```

### ServiceAccount
Please note, all names above can be changed. Prefix `prescott-` is used for demonstration purposes.\
(0) Create a namespace - (**Optional, but recommended**):
```shell
kubectl create namespace 'prescott'
```
(1) Create a `service-account`
```shell
kubectl create serviceaccount 'prescott-sa' -n 'prescott'
```

(2) Create a role. Refer to [role.yml](./role.yml) for more details:
```shell
kubectl apply -f role.yml
```

(3) Bind created `role` to `service-account`. Refer to [binding.yml](./binding.yml) for more details:
```shell
kubectl apply -f binding.yml
```

(4) Export `token` of created `service-account`
```shell
kubectl create token 'prescott-account' # without namespace
kubectl create token 'prescott-account' -n 'prescott' # with namespaxce
```

(5) Export `host` K8s cluster:
```shell
kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}'
```

(6) Use values in `opts` of `envRunner`:
```json
{
  "opts": {
    "host": "host from (4)",
    "token": "token from (5)",
    "namespace": "optional namespace from (0)"
  }
}
```

## Local development

All tests are using local cluster created by kind. There are only two requirements for the cluster:

1. It should have a name `prescott-test`
2. Metrics-server should be installed and running

To prepare such a cluster use the [prepare.sh](./prepare.sh) script\
To delete the cluster use [clean.sh](./clean.sh) script
