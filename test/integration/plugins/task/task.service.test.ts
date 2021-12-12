import { DockerService } from '@plugins/docker/docker.service';
import { TaskDao } from '@plugins/task/task.dao';
import { TaskService } from '@plugins/task/task.service';
import { getScheduledTasks } from '@plugins/task/task.repository';
import { buildTaskIdentifier } from '@plugins/task/task.utils';
import { cronEveryNSeconds } from '@lib/cron.utils';
import { delay } from '@lib/time.utils';
import { PgConnection } from '@model/shared/pg-connection';
import { TaskConfigDto } from '@model/dto/task-config-dto';
import { DOCKER_IMAGES } from '@test/lib/test.const';
import { getConnection } from '@test/lib/test.utils';

describe('task.service integration', () => {
  let taskService: TaskService;
  let pg: PgConnection;

  const createGroup = async (): Promise<{ groupId: number }> => {
    const [id] = await pg('groups')
      .insert({
        name: 'mock_group',
      })
      .returning('id');
    return { groupId: id };
  };

  const createUser = async (): Promise<{ userId: number }> => {
    const [id] = await pg('users')
      .insert({
        login: 'mock_login',
        email: 'mock@mock.mock',
        fullName: 'Mock Mock',
        password: 'mock_password',
      })
      .returning('id');
    return { userId: id };
  };

  beforeEach(async () => {
    await pg('tasks').delete();
    await pg('groups').delete();
    await pg('users').delete();
  });

  beforeAll(async () => {
    pg = getConnection();
    taskService = new TaskService(new TaskDao(pg), new DockerService());
  });

  afterAll(async () => {
    await pg.destroy();
  });

  it('should create local task and then delete it', async () => {
    const { groupId } = await createGroup();
    const { userId } = await createUser();

    const taskName = 'mock_task_name';
    const identifier = buildTaskIdentifier(groupId, taskName);

    const taskConfigDto: TaskConfigDto = {
      name: taskName,
      osInfo: DOCKER_IMAGES.alpine,
      config: {
        local: {
          cronString: cronEveryNSeconds(1),
        },
        appConfig: {
          steps: [
            // sleep 100 makes test hang until delete
            { name: 'first', script: 'sleep 100 && echo "hello world!"' },
          ],
        },
      },
    };

    const taskId = await taskService.createTask(groupId, userId, taskConfigDto);

    const cronTasksNames = Object.keys(getScheduledTasks());
    expect(cronTasksNames).toHaveLength(1);
    expect(cronTasksNames[0]).toEqual(identifier);

    const tasks = await pg('tasks').select();
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({ name: identifier });

    await taskService.deleteTask(taskId);

    expect(await pg('tasks').select()).toHaveLength(0);
    expect(getScheduledTasks()).toStrictEqual({}); // is empty
  });

  it('should delete task if once is specified', async () => {
    const { groupId } = await createGroup();
    const { userId } = await createUser();

    const taskConfigDto: TaskConfigDto = {
      name: 'mock_task_name',
      osInfo: DOCKER_IMAGES.alpine,
      once: true, // should delete both task and db entry
      config: {
        local: {
          cronString: cronEveryNSeconds(1),
        },
        appConfig: {
          steps: [{ name: 'first', script: 'echo "hello world!"' }],
        },
      },
    };

    await taskService.createTask(groupId, userId, taskConfigDto);
    await delay(5e3); // wait 5 seconds to be sure it's deleted

    const tasks = await pg('tasks').select();
    const cronTasks = getScheduledTasks();

    expect(tasks).toHaveLength(0);
    expect(cronTasks).toStrictEqual({});
  });

  // TODO: add more tests to check stages when metrics will be ready
});
