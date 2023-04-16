import { buildServer } from '@src/app';
import {
  createAndLoginTestUser,
  createTestGroup,
} from '@test/lib/test-data.utils';
import { TaskConfigDto } from '@model/dto/task-config.dto';
import { generateRandomString } from '@lib/random.utils';
import { cronEveryNSeconds } from '@lib/cron.utils';
import { encodeBase64 } from '@lib/string.utils';
import { DOCKER_IMAGES } from '@test/lib/test.const';
import { delay } from '@lib/time.utils';

describe.skip('task e2e', () => {
  it('should create a task and then delete it', async () => {
    const fastify = await buildServer();
    const { authenticationService, authorizationService, jwtService } = fastify;

    const { userId, tokenPair } = await createAndLoginTestUser(
      authenticationService,
      jwtService
    );
    const { groupId } = await createTestGroup(authorizationService, userId);

    const taskConfig: TaskConfigDto = {
      name: generateRandomString('task'),
      osInfo: DOCKER_IMAGES.alpine,
      once: false,
      config: {
        local: { cronString: cronEveryNSeconds(5) },
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

    const taskId = createRes.json().taskId as number;
    const getRes = await fastify.inject({
      method: 'GET',
      url: `/groups/${groupId}/tasks/${taskId}`,
      headers: { Authorization: `Bearer ${tokenPair.accessToken}` },
    });
    expect(getRes.statusCode).toEqual(200);
    expect(getRes.json()).toMatchObject({
      //
    });

    await fastify.close();
  });
});
