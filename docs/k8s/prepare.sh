#!/bin/sh

kind create cluster --config=config.yml &&\
sleep 10s &&\
kubectl cluster-info --context kind-prescott-test &&\
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml &&\
kubectl patch -n kube-system deployment metrics-server --type=json \
  -p '[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}]'
