FROM node:20.9-bullseye-slim AS base
WORKDIR /usr/src/app
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=yarn.lock,target=yarn.lock \
    yarn --frozen-lockfile

FROM base AS builder
RUN --mount=type=bind,source=src,target=src \
    --mount=type=bind,source=@types,target=@types \
    --mount=type=bind,source=knexfile.ts,target=knexfile.ts \
    --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=tsconfig.json,target=tsconfig.json \
    --mount=type=bind,source=/usr/src/app/node_modules,target=node_modules,from=base \
    yarn build

FROM base AS runner

# install docker
RUN apt-get update && apt-get install -y lsb-release curl gnupg
RUN curl -fsSLo /usr/share/keyrings/docker-archive-keyring.asc \
  https://download.docker.com/linux/debian/gpg
RUN echo "deb [arch=$(dpkg --print-architecture) \
  signed-by=/usr/share/keyrings/docker-archive-keyring.asc] \
  https://download.docker.com/linux/debian \
  $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list
RUN apt-get update && apt-get install -y docker-ce-cli

# setup arguments
ARG PRESCOTT_LOG_LEVEL=info
ARG PRESCOTT_WORKDIR=/var/lib/prescott
ARG PRESCOTT_PORT=8080

# setup env variables
ENV PRESCOTT_LOG_LEVEL=info
ENV PRESCOTT_PORT=$PRESCOTT_PORT
ENV PRESCOTT_DB_CLIENT=better-sqlite3
ENV PRESCOTT_DB_CONN_STRING=$PRESCOTT_WORKDIR/src/workdir/data/prescott.sqlite

# setup workdir
WORKDIR $PRESCOTT_WORKDIR
RUN mkdir -p $PRESCOTT_WORKDIR

# copy files
COPY package.json .
COPY tsconfig.json .
COPY src ./src
COPY @types @types
COPY migrations ./migrations
COPY knexfile.ts .
COPY ./docker/scripts/run-prescott.sh run-prescott.sh
COPY --from=base /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/build ./build

# run server
ENV PRESCOTT_WORKDIR=$PRESCOTT_WORKDIR/src/workdir
EXPOSE ${PRESCOTT_PORT}
CMD ["/bin/sh", "./run-prescott.sh"]
