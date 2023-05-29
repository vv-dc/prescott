# Docker

## Build
```sh
docker build -f docker/Dockerfile -t prescott:latest .
```

## Run
```shell
docker run \
--name prescott \
--rm \
--privileged \
-v /var/run/docker.sock:/var/run/docker.sock \
--env PRESCOTT_JWT_SECRET=somesecret \
--volume prescott_data:/var/lib/prescott/src/workdir \
--publish 8080:8080 \
prescott
```
