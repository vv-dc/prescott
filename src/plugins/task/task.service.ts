import * as taskRepository from '@plugins/task/task.repository';
import { DockerService } from '@plugins/docker/docker.service';
import { TaskDao } from '@plugins/task/task.dao';
import { buildDockerCmd, buildTaskIdentifier } from '@plugins/task/task.utils';
import { asyncGeneratorToArray } from '@lib/async.utils';
import { generateRandomString } from '@lib/random.utils';
import { Step, TaskConfigDto } from '@model/dto/task-config-dto';
import { TaskRegisterResult } from '@plugins/task/task.model';
import { OsInfo } from '@model/domain/os-info';
import { TaskCronConfig } from '@plugins/task/model/task-cron-config';
import { cronEveryNMinutes } from '@lib/cron.utils';
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
      name: identifier,
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
      const { id, name, config } = task as Required<Task>;
      const taskConfig: TaskConfigDto = JSON.parse(config);
      await this.register(name, id, taskConfig);
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
    const identifier = buildTaskIdentifier(groupId, name);

    const taskId = await this.dao.create({
      userId,
      groupId,
      name: identifier,
      config: JSON.stringify(taskConfig),
    });

    if (clearTask) {
      const { steps } = config.appConfig;
      await this.buildClearTask(identifier, osInfo, steps);
    }

    await this.register(identifier, taskId, taskConfig);
    return taskId;
  }

  async deleteTask(id: number): Promise<void> {
    const { name: identifier } = await this.dao.findById(id);
    taskRepository.deleteTask(identifier);

    const containers = await this.dockerService.getImageAncestors(identifier);
    for (const container of containers) {
      await this.dockerService.deleteContainer(container, true);
    }

    await this.dockerService.deleteImage(identifier, true);
    await this.dao.delete(id);
  }

  async stopTask(id: number): Promise<void> {
    const { name: identifier } = await this.dao.findById(id);
    taskRepository.stopTask(identifier);
  }

  async updateTask(groupId: number, taskId: number, taskConfig: TaskConfigDto) {
    const oldTask = await this.dao.findById(taskId);
    taskRepository.deleteTask(oldTask.name);

    await this.dao.update(taskId, JSON.stringify(taskConfig));
    const identifier = buildTaskIdentifier(groupId, taskConfig.name);
    await this.register(identifier, taskId, taskConfig);
  }

  async getTask(taskId: number) {
    return this.dao.findById(taskId);
  }
}
