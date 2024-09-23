#!/bin/sh

DIR="$(dirname $0)"
PRESCOTT_DIR="$DIR/../../src/workdir/data/k8s"

# ensure directory exists
if [ ! -d $PRESCOTT_DIR ]; then
  mkdir -p $PRESCOTT_DIR
fi

# create cluster and wait for its initialization
kind create cluster --config=config.yml
sleep 10s

# connect to cluster
PRESCOTT_CLUSTER='prescott-test'
kubectl cluster-info --context "kind-$PRESCOTT_CLUSTER"

# setup metrics server
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
kubectl patch -n kube-system deployment metrics-server --type=json \
  -p '[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}]'

# save kubeconfig (for kubeconfig authentication)
kind export kubeconfig --name $PRESCOTT_CLUSTER --kubeconfig "$PRESCOTT_DIR/kubeconfig.yml"

# create service account (for host + token authentication)
PRESCOTT_NAMESPACE='prescott'
PRESCOTT_ACCOUNT='prescott-sa'
kubectl create namespace $PRESCOTT_NAMESPACE
kubectl create serviceaccount $PRESCOTT_ACCOUNT -n $PRESCOTT_NAMESPACE &&\
kubectl apply -f role.yml &&\
kubectl apply -f binding.yml &&\

# export service-account bearer and K8s host
BEARER=$(kubectl create token $PRESCOTT_ACCOUNT -n $PRESCOTT_NAMESPACE)
HOST=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')
echo "{\"host\":\"$HOST\",\"namespace\":\"$PRESCOTT_NAMESPACE\",\"token\":\"$BEARER\"}" > "$PRESCOTT_DIR/api.json"
