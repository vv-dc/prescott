import { DockerService } from '@plugins/docker/docker.service';
import { TaskDao } from '@plugins/task/task.dao';
import { TaskService } from '@plugins/task/task.service';
import { existsTask, getScheduledTasks } from '@plugins/task/task.repository';
import { buildTaskUniqueName } from '@plugins/task/task.utils';
import { cronEveryNMinutes, cronEveryNSeconds } from '@lib/cron.utils';
import { delay } from '@lib/time.utils';
import { PgConnection } from '@model/shared/pg-connection';
import { LocalTaskConfig, TaskConfigDto } from '@model/dto/task-config.dto';
import { DOCKER_IMAGES } from '@test/lib/test.const';
import { getConnection } from '@test/lib/test.utils';
import { encodeBase64 } from '@lib/string.utils';
import { EntityNotFound } from '@modules/errors/abstract-errors';

describe('task.service integration', () => {
  let taskService: TaskService;
  let taskDao: TaskDao;
  let pg: PgConnection;

  const createGroup = async (ownerId: number): Promise<{ groupId: number }> => {
    const [{ id }] = await pg('groups')
      .insert({
        name: 'mock_group',
        ownerId,
      })
      .returning<{ id: number }[]>('id');
    return { groupId: id };
  };

  const createUser = async (): Promise<{ userId: number }> => {
    const [{ id }] = await pg('users')
      .insert({
        login: 'mock_login',
        email: 'mock@mock.mock',
        fullName: 'Mock Mock',
        password: 'mock_password',
      })
      .returning<{ id: number }[]>('id');
    return { userId: id };
  };

  beforeEach(async () => {
    await pg('tasks').delete();
    await pg('groups').delete();
    await pg('users').delete();
  });

  beforeAll(async () => {
    pg = getConnection();
    taskDao = new TaskDao(pg);
    taskService = new TaskService(taskDao, new DockerService());
  });

  afterAll(async () => {
    await pg.destroy();
  });

  it('should create local task and then delete it', async () => {
    const { userId } = await createUser();
    const { groupId } = await createGroup(userId);

    const taskName = 'mock_task_name';
    const identifier = buildTaskUniqueName(groupId, taskName);

    const taskConfigDto: TaskConfigDto = {
      name: taskName,
      osInfo: DOCKER_IMAGES.alpine,
      config: {
        local: { cronString: cronEveryNSeconds(1) },
        appConfig: {
          steps: [
            // sleep 100 makes test hang until delete
            {
              name: 'first',
              script: encodeBase64('sleep 100 && echo "hello world!"'),
            },
          ],
        },
      },
    };

    const taskId = await taskService.createTask(groupId, userId, taskConfigDto);

    const cronTasksNames = Object.keys(getScheduledTasks());
    expect(cronTasksNames).toHaveLength(1);
    expect(cronTasksNames[0]).toEqual(taskId.toString());

    const beforeTask = await taskDao.findById(taskId);
    expect(beforeTask).toMatchObject({ name: identifier });

    await taskService.deleteTask(taskId);

    expect(await taskDao.findById(taskId)).toEqual(undefined);
    expect(getScheduledTasks()).toStrictEqual({}); // is empty
  });

  it('should delete task if once is specified', async () => {
    const { userId } = await createUser();
    const { groupId } = await createGroup(userId);

    const taskConfigDto: TaskConfigDto = {
      name: 'mock_task_name',
      osInfo: DOCKER_IMAGES.alpine,
      once: true,
      config: {
        local: { cronString: cronEveryNSeconds(1) },
        appConfig: {
          steps: [
            {
              name: 'first',
              script: encodeBase64('echo "hello world!"'),
            },
          ],
        },
      },
    };

    const taskId = await taskService.createTask(groupId, userId, taskConfigDto);
    await delay(7000);

    expect(existsTask(taskId)).toBeFalsy();
    await expect(taskService.getTask(taskId)).rejects.toEqual(
      new EntityNotFound('Task does not exist')
    );
  });

  it('should stop and then start task', async () => {
    const { userId } = await createUser();
    const { groupId } = await createGroup(userId);

    const taskConfigDto: TaskConfigDto = {
      name: 'mock_task_name',
      osInfo: DOCKER_IMAGES.alpine,
      config: {
        local: { cronString: cronEveryNMinutes(5) },
        appConfig: {
          steps: [
            { name: 'first', script: encodeBase64('echo "hello world!"') },
          ],
        },
      },
    };

    const taskId = await taskService.createTask(groupId, userId, taskConfigDto);

    await taskService.stopTask(taskId);
    const stoppedTask = await taskService.getTask(taskId);
    expect(stoppedTask).toMatchObject({ active: false });
    expect(getScheduledTasks()).toHaveProperty(taskId.toString());

    await taskService.startTask(taskId);
    const startedTask = await taskService.getTask(taskId);
    expect(startedTask).toMatchObject({ active: true });

    await taskService.deleteTask(taskId);
  });

  it('should update partial config', async () => {
    const { userId } = await createUser();
    const { groupId } = await createGroup(userId);

    const oldPartialConfig: LocalTaskConfig = {
      local: { cronString: cronEveryNMinutes(5) },
      appConfig: {
        steps: [{ name: 'old', script: encodeBase64('echo "old hello"') }],
      },
    };

    const taskConfig: TaskConfigDto = {
      name: 'mock_task_name',
      osInfo: DOCKER_IMAGES.alpine,
      config: oldPartialConfig,
    };

    const taskId = await taskService.createTask(groupId, userId, taskConfig);
    const { config: oldTaskConfig } = await taskService.getTask(taskId);
    expect(oldTaskConfig).toMatchObject(oldPartialConfig);

    const newPartialConfig: LocalTaskConfig = {
      local: { cronString: cronEveryNMinutes(10) },
      appConfig: {
        steps: [{ name: 'new', script: encodeBase64('echo "new hello"') }],
      },
    };

    await taskService.updateTask(groupId, taskId, newPartialConfig);
    const { config: newTaskConfig } = await taskService.getTask(taskId);
    expect(newTaskConfig).toMatchObject(newPartialConfig);

    await taskService.deleteTask(taskId);
  });

  // TODO: add more tests to check stages when metrics will be ready
});
