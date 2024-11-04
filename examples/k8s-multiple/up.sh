#!/bin/bash

DIR="$(dirname $0)"
CLUSTERS=("prescott-test-1" "prescott-test-2")

HOSTS=()
BEARERS=()

for CLUSTER_NAME in "${CLUSTERS[@]}"; do
    # create cluster and wait for its initialization
    kind create cluster --name=$CLUSTER_NAME
    sleep 10s

    # connect to cluster
    PRESCOTT_NAMESPACE='prescott'
    kubectl cluster-info --context "kind-$CLUSTER_NAME"
    kubectl create namespace $PRESCOTT_NAMESPACE

    # setup metrics server
    kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
    kubectl patch -n kube-system deployment metrics-server --type=json \
    -p '[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}]'

    # create service account (for host + token authentication)
    cd "$DIR/../../docs/k8s"
    PRESCOTT_ACCOUNT='prescott-sa'
    kubectl create serviceaccount $PRESCOTT_ACCOUNT -n $PRESCOTT_NAMESPACE &&\
    kubectl apply -f role.yml &&\
    kubectl apply -f binding.yml &&\

    # export service-account bearer and K8s host
    BEARER=$(kubectl create token $PRESCOTT_ACCOUNT -n $PRESCOTT_NAMESPACE --duration=120h) # 5 days
    HOST=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')

    HOSTS+=($HOST)
    BEARERS+=($BEARER)

    cd $DIR
done

# save bearers and tokens
echo -e "K8S_CLUSTER_HOST_1='${HOSTS[0]}'\nK8S_CLUSTER_TOKEN_1='${BEARERS[0]}'\n" > "$DIR/.env"
echo -e "K8S_CLUSTER_HOST_2='${HOSTS[1]}'\nK8S_CLUSTER_TOKEN_2='${BEARERS[1]}'\n" >> "$DIR/.env"
