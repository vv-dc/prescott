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

  private async buildClearTask(
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
  }

  async createTask(
    groupId: number,
    userId: number,
    taskConfig: TaskConfigDto
  ): Promise<number> {
    const { name, osInfo, config } = taskConfig;
    const clearTask = !('repository' in config);

    const taskId = await this.dao.create({
      userId,
      groupId,
      name: buildTaskUniqueName(groupId, name),
      config: JSON.stringify(taskConfig),
    });

    const identifier = buildTaskIdentifier(taskId);
    if (clearTask) {
      const { steps } = config.appConfig;
      await this.buildClearTask(identifier, osInfo, steps);
    }

    await this.register(identifier, taskId, taskConfig);
    return taskId;
  }

  async deleteTask(taskId: number): Promise<void> {
    const identifier = buildTaskIdentifier(taskId);
    taskRepository.deleteTask(taskId);

    const containers = await this.dockerService.getImageAncestors(identifier);
    for (const container of containers) {
      await this.dockerService.deleteContainer(container, true);
    }

    await this.dockerService.deleteImage(identifier, true);
    await this.dao.delete(taskId);
  }

  async stopTask(taskId: number): Promise<void> {
    const identifier = buildTaskIdentifier(taskId);
    taskRepository.stopTask(taskId);

    const containers = await this.dockerService.getImageAncestors(identifier);
    for (const container of containers) {
      await this.dockerService.stop(container);
    }

    await this.dao.setActive(taskId, false);
  }

  async startTask(taskId: number): Promise<void> {
    await this.dao.setActive(taskId, true);

    if (!taskRepository.existsTask(taskId)) {
      const { config } = await this.dao.findById(taskId);
      const identifier = buildTaskIdentifier(taskId);
      await this.register(identifier, taskId, JSON.parse(config));
    } else taskRepository.startTask(taskId);
  }

  async updateTask(
    groupId: number,
    taskId: number,
    taskConfig: LocalTaskConfig | RepositoryTaskConfig
  ): Promise<void> {
    const identifier = buildTaskIdentifier(taskId);
    taskRepository.deleteTask(taskId);

    const { config } = await this.dao.findById(taskId);
    const oldTaskConfig = JSON.parse(config);
    const newTaskConfig = { ...oldTaskConfig, config: taskConfig };

    await this.dao.update(taskId, JSON.stringify(newTaskConfig));
    await this.dockerService.deleteImage(identifier, true);
    await this.register(identifier, taskId, newTaskConfig);
  }

  async getTask(
    taskId: number
  ): Promise<Task & (TaskConfigDto | RepositoryTaskConfig)> {
    const task = await this.dao.findById(taskId);
    return { ...task, ...JSON.parse(task.config) };
  }
}
