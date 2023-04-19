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

// TODO: improve tests once logs + metrics implemented
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
        local: { cronString: cronEveryNSeconds(1) },
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
      local: { cronString: cronEveryNSeconds(1) },
      appConfig: {
        limitations: { ram: '1g', ttl: 3 },
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
});
