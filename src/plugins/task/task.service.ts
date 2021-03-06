import * as taskRepository from '@plugins/task/task.repository';

import { DockerService } from '@plugins/docker/docker.service';
import { TaskDao } from '@plugins/task/task.dao';
import {
  buildDockerCmd,
  buildTaskIdentifier,
  buildTaskUniqueName,
} from '@plugins/task/task.utils';
import { TaskCronConfig } from '@plugins/task/model/task-cron-config';
import { TaskRegisterResult } from '@plugins/task/model/task-register-result';
import {
  EntityConflict,
  EntityNotFound,
} from '@modules/errors/abstract-errors';
import { asyncGeneratorToArray } from '@lib/async.utils';
import { generateRandomString } from '@lib/random.utils';
import { cronEveryNMinutes } from '@lib/cron.utils';
import {
  TaskConfigDto,
  Step,
  LocalTaskConfig,
  RepositoryTaskConfig,
} from '@model/dto/task-config.dto';
import { OsInfo } from '@model/domain/os-info';
import { Task } from '@model/domain/task';

export class TaskService {
  constructor(private dao: TaskDao, private dockerService: DockerService) {}

  // task is like a clean function, so there is no need to re-build it
  private async runTask(
    identifier: string,
    taskId: number,
    taskConfig: TaskConfigDto
  ): Promise<void> {
    const { once, config } = taskConfig;
    const container = generateRandomString(identifier);

    await this.dockerService.run({
      image: identifier,
      container,
      detached: true,
      withDelete: false,
      limitations: config.appConfig?.limitations,
    });

    const rawStatsGenerator = this.dockerService.stats(container);
    const rawStats = await asyncGeneratorToArray(rawStatsGenerator);
    const logs = await this.dockerService.logs(container);

    await this.dockerService.deleteContainer(container);
    if (once) {
      await this.deleteTask(taskId);
      await this.dockerService.deleteImage(identifier);
    }
    // await this.metricsService.save(rawStats, logs)
  }

  // TODO: implement watch for repository
  async runWatch(
    identifier: string,
    taskId: number,
    config: TaskConfigDto
  ): Promise<TaskRegisterResult> {
    // TODO: try to clone, build and then run
    return {} as TaskRegisterResult;
  }

  private async register(
    identifier: string,
    taskId: number,
    taskConfig: TaskConfigDto
  ): Promise<void> {
    const { config } = taskConfig;
    const external = 'repository' in config;

    const taskCronConfig: TaskCronConfig = {
      taskId,
      callback: async () => {
        const runner = external ? 'runWatch' : 'runTask';
        await this[runner](identifier, taskId, taskConfig);
      },
      cronString: external ? cronEveryNMinutes(5) : config.local.cronString,
    };

    taskRepository.addTask(taskCronConfig);
  }

  async registerFromDatabase(): Promise<void> {
    const tasks = await this.dao.findAll();
    for (const task of tasks) {
      const { id, config, active } = task as Required<Task>;
      if (active) {
        const taskConfig: TaskConfigDto = JSON.parse(config);
        const identifier = buildTaskIdentifier(id);
        await this.register(identifier, id, taskConfig);
      }
    }
  }

  // we do not want to make user wait until build
  // so we just create task, but start it only after build
  private async buildClearTask(
    taskId: number,
    identifier: string,
    osInfo: OsInfo,
    steps: Step[]
  ): Promise<void> {
    await this.dockerService.build({
      tag: identifier,
      osInfo,
      cmd: buildDockerCmd(identifier, steps),
      once: true,
      copy: false,
    });
    taskRepository.startTask(taskId);
  }

  async createTask(
    groupId: number,
    userId: number,
    taskConfig: TaskConfigDto
  ): Promise<number> {
    const { name, osInfo, config, once } = taskConfig;
    if ((await this.dao.findByName(name)) !== undefined) {
      throw new EntityConflict('Task with passed name already exists');
    }

    const taskId = await this.dao.create({
      userId,
      groupId,
      name: buildTaskUniqueName(groupId, name),
      active: !once, // one time task should be disabled immediately
      config: JSON.stringify(taskConfig),
    });

    const identifier = buildTaskIdentifier(taskId);
    await this.register(identifier, taskId, taskConfig); // cron job created, but not started
    const clearTask = !('repository' in config);

    if (clearTask) {
      const { steps } = config.appConfig;
      setImmediate(() => {
        this.buildClearTask(taskId, identifier, osInfo, steps);
      });
    }

    return taskId;
  }

  async deleteTask(taskId: number): Promise<void> {
    taskRepository.deleteTask(taskId);
    await this.assertTaskExists(taskId);

    const identifier = buildTaskIdentifier(taskId);
    const containers = await this.dockerService.getImageAncestors(identifier);
    for (const container of containers) {
      await this.dockerService.deleteContainer(container, true);
    }

    await this.dockerService.deleteImage(identifier, true);
    await this.dao.delete(taskId);
  }

  async stopTask(taskId: number): Promise<void> {
    await this.assertTaskExists(taskId);

    const identifier = buildTaskIdentifier(taskId);
    taskRepository.stopTask(taskId);

    const containers = await this.dockerService.getImageAncestors(identifier);
    for (const container of containers) {
      await this.dockerService.stop(container);
    }

    await this.dao.setActive(taskId, false);
  }

  private async assertTaskExists(taskId: number): Promise<void> {
    const task = await this.dao.findById(taskId);
    if (task === undefined) {
      throw new EntityNotFound('Task does not exist');
    }
  }

  async startTask(taskId: number): Promise<void> {
    await this.assertTaskExists(taskId);

    await this.dao.setActive(taskId, true);
    if (!taskRepository.existsTask(taskId)) {
      const { config } = (await this.dao.findById(taskId)) as Task;
      const identifier = buildTaskIdentifier(taskId);
      await this.register(identifier, taskId, JSON.parse(config));
    }
    taskRepository.startTask(taskId);
  }

  async updateTask(
    groupId: number,
    taskId: number,
    taskConfig: LocalTaskConfig | RepositoryTaskConfig
  ): Promise<void> {
    const identifier = buildTaskIdentifier(taskId);
    taskRepository.deleteTask(taskId);

    const task = await this.dao.findById(taskId);
    if (task === undefined) {
      throw new EntityNotFound('Task does not exist');
    }

    const oldTaskConfig = JSON.parse(task.config);
    const newTaskConfig = { ...oldTaskConfig, config: taskConfig };

    await this.dao.update(taskId, JSON.stringify(newTaskConfig));
    await this.dockerService.deleteImage(identifier, true);
    await this.register(identifier, taskId, newTaskConfig);
  }

  async getTask(
    taskId: number
  ): Promise<Task & (TaskConfigDto | RepositoryTaskConfig)> {
    const task = await this.dao.findById(taskId);
    if (task == undefined) {
      throw new EntityNotFound('Task does not exist');
    }
    return { ...task, ...JSON.parse(task.config) };
  }
}
