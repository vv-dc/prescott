import { buildServer } from '@src/app';
import { generateRandomString } from '@lib/random.utils';
import { cronEveryNSeconds } from '@lib/cron.utils';
import { encodeBase64 } from '@lib/string.utils';
import { Task } from '@model/domain/task';
import { TaskConfigDto } from '@model/dto/task-config.dto';
import { DOCKER_IMAGES } from '@test/lib/test.const';
import {
  createAndLoginTestUser,
  createTestGroup,
} from '@test/lib/test-data.utils';
import { delay } from '@lib/time.utils';
import { LocalTaskConfig } from '@model/domain/local-task-config';
import { TaskRun } from '@model/domain/task-run';
import { EntryPage } from '@modules/contract/model/entry-paging';
import { LogEntry } from '@modules/contract/model/log-entry';
import {
  MetricEntry,
  MetricsAggregated,
} from '@modules/contract/model/metric-entry';

describe('task e2e', () => {
  it('should do CRUD on task', async () => {
    // PREPARE data
    const fastify = await buildServer();
    const { authenticationService, authorizationService, jwtService } = fastify;

    const { userId, tokenPair } = await createAndLoginTestUser(
      authenticationService,
      jwtService
    );
    const { groupId } = await createTestGroup(authorizationService, userId);

    // CREATE task
    const taskConfig: TaskConfigDto = {
      name: generateRandomString('task'),
      osInfo: DOCKER_IMAGES.alpine,
      once: false,
      config: {
        local: { cronString: cronEveryNSeconds(10) },
        appConfig: {
          steps: [
            {
              name: 'Say hello',
              script: encodeBase64(
                'for i in {1..5}; do echo "hello-${i}"; done'
              ),
            },
          ],
        },
      },
    };
    const createRes = await fastify.inject({
      method: 'POST',
      url: `/groups/${groupId}/tasks`,
      headers: { Authorization: `Bearer ${tokenPair.accessToken}` },
      payload: taskConfig,
    });
    expect(createRes.statusCode).toEqual(201);
    expect(createRes.json()).toMatchObject({ taskId: expect.any(Number) });

    // GET task
    const taskId = createRes.json().taskId as number;
    const getRes = await fastify.inject({
      method: 'GET',
      url: `/groups/${groupId}/tasks/${taskId}`,
      headers: { Authorization: `Bearer ${tokenPair.accessToken}` },
    });
    expect(getRes.statusCode).toEqual(200);
    expect(getRes.json()).toMatchObject({
      id: taskId,
      name: taskConfig.name,
      userId,
      groupId,
      config: taskConfig,
      active: true,
    } as Task & { config: TaskConfigDto });

    // UPDATE task
    const newConfig: LocalTaskConfig = {
      local: { cronString: cronEveryNSeconds(10) },
      appConfig: {
        steps: [
          {
            name: 'Say hello',
            script: encodeBase64('for i in {1..5}; do echo "hello-${i}"; done'),
          },
        ],
      },
    };
    const updateRes = await fastify.inject({
      method: 'PUT',
      url: `/groups/${groupId}/tasks/${taskId}`,
      payload: newConfig,
      headers: { Authorization: `Bearer ${tokenPair.accessToken}` },
    });
    expect(updateRes.statusCode).toEqual(204);

    // GET updated task
    const getUpdatedRes = await fastify.inject({
      method: 'GET',
      url: `/groups/${groupId}/tasks/${taskId}`,
      headers: { Authorization: `Bearer ${tokenPair.accessToken}` },
    });
    expect(getUpdatedRes.statusCode).toEqual(200);
    expect(getUpdatedRes.json()).toMatchObject({
      id: taskId,
      name: taskConfig.name,
      userId,
      groupId,
      config: { config: newConfig },
      active: true,
    } as Task & { config: TaskConfigDto });

    // DELETE task
    const deleteRes = await fastify.inject({
      method: 'DELETE',
      url: `/groups/${groupId}/tasks/${taskId}`,
      headers: { Authorization: `Bearer ${tokenPair.accessToken}` },
    });
    expect(deleteRes.statusCode).toEqual(204);

    // GET to check task deleted
    const getResAgain = await fastify.inject({
      method: 'GET',
      url: `/group/${groupId}/tasks/${taskId}`,
      headers: { Authorization: `Bearer ${tokenPair.accessToken}` },
    });
    expect(getResAgain.statusCode).toEqual(404);

    await fastify.close();
  });

  it('should STOP and START task', async () => {
    // PREPARE data
    const fastify = await buildServer();
    const { authenticationService, authorizationService, jwtService } = fastify;

    const { userId, tokenPair } = await createAndLoginTestUser(
      authenticationService,
      jwtService
    );
    const { groupId } = await createTestGroup(authorizationService, userId);

    // CREATE task
    const taskConfig: TaskConfigDto = {
      name: generateRandomString('task'),
      osInfo: DOCKER_IMAGES.alpine,
      once: false,
      config: {
        local: { cronString: cronEveryNSeconds(1) },
        appConfig: {
          steps: [
            {
              name: 'Here we go',
              script: encodeBase64(`while true; do; echo 'here' sleep 1; done`),
            },
          ],
        },
      },
    };
    const createRes = await fastify.inject({
      method: 'POST',
      url: `/groups/${groupId}/tasks`,
      headers: { Authorization: `Bearer ${tokenPair.accessToken}` },
      payload: taskConfig,
    });
    expect(createRes.statusCode).toEqual(201);
    expect(createRes.json()).toMatchObject({ taskId: expect.any(Number) });
    const taskId: number = createRes.json().taskId;

    // STOP task
    const stopRes = await fastify.inject({
      method: 'POST',
      url: `/groups/${groupId}/tasks/${taskId}/stop`,
      headers: { Authorization: `Bearer ${tokenPair.accessToken}` },
    });
    expect(stopRes.statusCode).toEqual(204);

    // GET stopped task
    const stoppedGetRes = await fastify.inject({
      method: 'GET',
      url: `/groups/${groupId}/tasks/${taskId}`,
      headers: { Authorization: `Bearer ${tokenPair.accessToken}` },
    });
    expect(stoppedGetRes.statusCode).toEqual(200);
    expect(stoppedGetRes.json()).toMatchObject({ active: false } as Task);

    // START task
    const startRes = await fastify.inject({
      method: 'POST',
      url: `/groups/${groupId}/tasks/${taskId}/start`,
      headers: { Authorization: `Bearer ${tokenPair.accessToken}` },
    });
    expect(startRes.statusCode).toEqual(204);

    // GET started task
    const startedGetRes = await fastify.inject({
      method: 'GET',
      url: `/groups/${groupId}/tasks/${taskId}`,
      headers: { Authorization: `Bearer ${tokenPair.accessToken}` },
    });
    expect(startedGetRes.statusCode).toEqual(200);
    expect(startedGetRes.json()).toMatchObject({ active: true } as Task);

    // DELETE task
    const deletedRes = await fastify.inject({
      method: 'DELETE',
      url: `/groups/${groupId}/tasks/${taskId}`,
      headers: { Authorization: `Bearer ${tokenPair.accessToken}` },
    });
    expect(deletedRes.statusCode).toEqual(204);

    await fastify.close();
  });

  it('should automatically stop task if once=true', async () => {
    // PREPARE data
    const fastify = await buildServer();
    const { authenticationService, authorizationService, jwtService } = fastify;

    const { userId, tokenPair } = await createAndLoginTestUser(
      authenticationService,
      jwtService
    );
    const { groupId } = await createTestGroup(authorizationService, userId);

    // CREATE task
    const taskConfig: TaskConfigDto = {
      name: generateRandomString('task'),
      osInfo: DOCKER_IMAGES.alpine,
      once: true,
      config: {
        local: { cronString: cronEveryNSeconds(1) },
        appConfig: {
          steps: [{ name: 'Nop', script: encodeBase64(`echo 'nop'`) }],
        },
      },
    };
    const createRes = await fastify.inject({
      method: 'POST',
      url: `/groups/${groupId}/tasks`,
      headers: { Authorization: `Bearer ${tokenPair.accessToken}` },
      payload: taskConfig,
    });
    expect(createRes.statusCode).toEqual(201);
    expect(createRes.json()).toMatchObject({ taskId: expect.any(Number) });
    const taskId: number = createRes.json().taskId;

    let isActive = false;
    for (let idx = 0; idx < 5; ++idx) {
      await delay(1_000); // wait 5 seconds

      const startedGetRes = await fastify.inject({
        method: 'GET',
        url: `/groups/${groupId}/tasks/${taskId}`,
        headers: { Authorization: `Bearer ${tokenPair.accessToken}` },
      });
      expect(startedGetRes.statusCode).toEqual(200);

      isActive ||= Boolean(startedGetRes.json().active);
      if (isActive) break;
    }

    expect(isActive).toEqual(false);

    const deletedRes = await fastify.inject({
      method: 'DELETE',
      url: `/groups/${groupId}/tasks/${taskId}`,
      headers: { Authorization: `Bearer ${tokenPair.accessToken}` },
    });
    expect(deletedRes.statusCode).toEqual(204);

    await fastify.close();
  });

  it('should collect logs and metrics per task run', async () => {
    // PREPARE data
    const fastify = await buildServer();
    const { authenticationService, authorizationService, jwtService } = fastify;

    const { userId, tokenPair } = await createAndLoginTestUser(
      authenticationService,
      jwtService
    );
    const { groupId } = await createTestGroup(authorizationService, userId);

    // CREATE task
    const taskConfig: TaskConfigDto = {
      name: generateRandomString('task'),
      osInfo: DOCKER_IMAGES.alpine,
      once: true,
      config: {
        local: { cronString: cronEveryNSeconds(1) },
        appConfig: {
          steps: [
            {
              name: 'Nop',
              script: encodeBase64(
                `for i in $(seq 50); do echo "nop-\${i}"; sleep 0.05; done`
              ),
            },
          ],
        },
      },
    };

    const createRes = await fastify.inject({
      method: 'POST',
      url: `/groups/${groupId}/tasks`,
      headers: { Authorization: `Bearer ${tokenPair.accessToken}` },
      payload: taskConfig,
    });
    expect(createRes.statusCode).toEqual(201);
    expect(createRes.json()).toMatchObject({ taskId: expect.any(Number) });
    const taskId: number = createRes.json().taskId;

    await delay(10_000);
    const getRunsRes = await fastify.inject({
      method: 'GET',
      url: `/groups/${groupId}/tasks/${taskId}/runs`,
      headers: { Authorization: `Bearer ${tokenPair.accessToken}` },
    });
    expect(getRunsRes.statusCode).toEqual(200);
    const taskRuns = getRunsRes.json<TaskRun[]>();
    expect(taskRuns).toHaveLength(1);
    expect(taskRuns[0]).toMatchObject({
      id: expect.any(Number),
      handleId: expect.any(String),
      taskId,
      status: 'succeed',
      createdAt: expect.any(String),
      startedAt: expect.any(String),
      finishedAt: expect.any(String),
    } as TaskRun);
    const runId = taskRuns[0].id;

    // GET logs - 1 2 11 12 21 22 31 32 41 42
    const searchTerm = encodeURIComponent('^nop-[12]+$');
    const logResponse = await fastify.inject({
      method: 'GET',
      url: `/groups/${groupId}/tasks/${taskId}/runs/${runId}/logs?search[searchTerm]=${searchTerm}&paging[pageSize]=5`,
      headers: { Authorization: `Bearer ${tokenPair.accessToken}` },
    });
    expect(logResponse.statusCode).toEqual(200);
    const logsPage = logResponse.json<EntryPage<LogEntry>>();
    expect(logsPage.entries.length).toEqual(5);
    expect(logsPage.next).toEqual(6);
    expect(logsPage.entries[0]).toMatchObject({
      stream: 'stdout',
      content: 'nop-1',
      time: expect.any(Number),
    } as LogEntry);

    // GET metrics
    const metricResponse = await fastify.inject({
      method: 'GET',
      url: `/groups/${groupId}/tasks/${taskId}/runs/${runId}/metrics?search[fromDate]=${new Date(
        '1970-01-01'
      ).toISOString()}`,
      headers: { Authorization: `Bearer ${tokenPair.accessToken}` },
    });
    expect(metricResponse.statusCode).toEqual(200);
    const metricPage = metricResponse.json<EntryPage<MetricEntry>>();
    expect(metricPage.entries.length).toBeGreaterThanOrEqual(1);
    expect(metricPage.entries[0]).toMatchObject({
      ram: expect.any(String),
      cpu: expect.any(String),
      time: expect.any(Number),
    } as MetricEntry);

    // GET aggregated metrics
    const aggregatedMetricResponse = await fastify.inject({
      method: 'GET',
      url: `/groups/${groupId}/tasks/${taskId}/runs/${runId}/metrics-aggregated?apply=ram,cpu,smth&search[fromDate]=${new Date(
        '1970-01-01'
      ).toISOString()}`,
      headers: { Authorization: `Bearer ${tokenPair.accessToken}` },
    });
    expect(aggregatedMetricResponse.statusCode).toEqual(200);
    const aggregated = aggregatedMetricResponse.json<MetricsAggregated>();
    expect(aggregated).toMatchObject({
      cpu: {
        max: expect.any(String),
        min: expect.any(String),
        avg: expect.any(String),
        cnt: expect.any(String),
        std: expect.any(String),
      },
      ram: {
        max: expect.any(String),
        min: expect.any(String),
        avg: expect.any(String),
        cnt: expect.any(String),
        std: expect.any(String),
      },
      smth: {
        max: '0.000',
        min: '0.000',
        avg: '0.000',
        cnt: '0.000',
        std: '0.000',
      },
    } as MetricsAggregated);

    // DELETE task
    const deletedRes = await fastify.inject({
      method: 'DELETE',
      url: `/groups/${groupId}/tasks/${taskId}`,
      headers: { Authorization: `Bearer ${tokenPair.accessToken}` },
    });
    expect(deletedRes.statusCode).toEqual(204);

    await fastify.close();
  });
});
