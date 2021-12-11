import { DockerService } from '@plugins/docker/docker.service';
import { TaskDao } from '@plugins/task/task.dao';
import { buildDockerCmd, buildTaskIdentifier } from '@plugins/task/task.utils';
import { asyncGeneratorToArray } from '@lib/async.utils';
import { generateRandomString } from '@lib/random.utils';
import { Step, TaskConfigDto } from '@model/dto/task-config-dto';
import { TaskRegisterResult } from '@plugins/task/task.model';
import { OsInfo } from '@model/domain/os-info';
import { addTask, deleteTask, stopTask } from '@plugins/task/task.repository';
import { TaskCronConfig } from '@plugins/task/model/task-cron-config';

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
      limitations: config.config?.limitations,
    });

    const rawStatsGenerator = this.dockerService.stats(container);
    const rawStats = await asyncGeneratorToArray(rawStatsGenerator);
    const logs = await this.dockerService.logs(container);

    await this.dockerService.deleteContainer(container);
    if (once) await this.deleteTask(identifier);
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
      cronString: external ? '*/5 * * * *' : config.local.cronString,
    };

    addTask(taskCronConfig);
  }

  async registerFromDatabase(): Promise<void> {
    const tasks = await this.dao.findAll();
    for (const task of tasks) {
      const { id, name, config } = task;
      const taskConfig: TaskConfigDto = JSON.parse(config);
      await this.register(name, id as number, taskConfig);
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
      const { steps } = config.config;
      await this.buildClearTask(identifier, osInfo, steps);
    }

    await this.register(identifier, taskId, taskConfig);
    return taskId;
  }

  async deleteTask(identifier: string): Promise<void> {
    await this.dao.deleteByName(identifier);
    deleteTask(identifier);
  }

  async stopTask(id: number): Promise<void> {
    const { name: identifier } = await this.dao.findById(id);
    stopTask(identifier);
  }

  async updateTask(groupId: number, taskId: number, taskConfig: TaskConfigDto) {
    const oldTask = await this.dao.findById(taskId);
    deleteTask(oldTask.name);

    await this.dao.update(taskId, JSON.stringify(taskConfig));
    const identifier = buildTaskIdentifier(groupId, taskConfig.name);
    await this.register(identifier, taskId, taskConfig);
  }

  async getTask(taskId: number) {
    return this.dao.findById(taskId);
  }
}
