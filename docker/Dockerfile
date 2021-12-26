FROM node:16-stretch-slim AS base
WORKDIR /usr/src/app
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=yarn.lock,target=yarn.lock \
    yarn --frozen-lockfile

FROM base AS lint
RUN --mount=type=bind,source=src,target=src \
    --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=.eslintrc,target=.eslintrc \
    --mount=type=bind,source=.prettierrc,target=.prettierrc \
    --mount=type=bind,source=/usr/src/app/node_modules,target=node_modules,from=base \
    yarn lint --format=json --output-file=main.lint.json

FROM base AS unit-test
RUN --mount=type=bind,source=src,target=src \
    --mount=type=bind,source=test/unit,target=test/unit \
    --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=jest.config.ts,target=jest.config.ts \
    --mount=type=bind,source=jest/jest.setup.ts,target=jest/jest.setup.ts \
    --mount=type=bind,source=tsconfig.json,target=tsconfig.json \
    --mount=type=bind,source=/usr/src/app/node_modules,target=node_modules,from=base \
    yarn test:unit --json --outputFile=main.unit.test.json

FROM base AS integration-test
RUN --mount=type=bind,source=src,target=src \
    --mount=type=bind,source=test/integration,target=test/integration \
    --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=tsconfig.json,target=tsconfig.json \
    --mount=type=bind,source=jest.config.ts,target=jest.config.ts \
    --mount=type=bind,source=jest/jest.setup.ts,target=jest/jest.setup.ts \
    --mount=type=bind,source=/usr/src/app/node_modules,target=node_modules,from=base \
    yarn test:integration --json --outputFile=main.integration.test.json

FROM scratch AS ci
COPY --from=lint /usr/src/app/main.lint.json .
COPY --from=unit-test /usr/src/app/main.unit.test.json .
#COPY --from=integration-test /usr/src/app/main.integration.test.json .
