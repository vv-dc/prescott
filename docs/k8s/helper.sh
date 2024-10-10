#!/bin/bash

kubectl config set-context --current --namespace=prescott
docker exec -it $(kind get clusters | head -1)-control-plane crictl image