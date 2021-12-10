import { DockerService } from '@plugins/docker/docker.service';
import { TaskDao } from '@plugins/task/task.dao';
import { buildDockerCmd, buildTaskIdentifier } from '@plugins/task/task.utils';
import { asyncGeneratorToArray } from '@lib/async.utils';
import { generateRandomString } from '@lib/random.utils';
import { Step, TaskConfigDto } from '@model/dto/task-config-dto';
import { Limitations } from '@model/domain/limitations';
import { TaskRegisterResult } from '@plugins/task/task.model';
import { OsInfo } from '@model/domain/os-info';
import { addTask } from '@plugins/task/task.repository';
import { TaskCronConfig } from '@plugins/task/model/task-cron-config.model';

export class TaskService {
  constructor(private dao: TaskDao, private dockerService: DockerService) {}

  // task is like a clean function, so there is no need to re-build it
  private async registerTask(
    identifier: string,
    limitations?: Limitations
  ): Promise<void> {
    const container = generateRandomString(identifier);

    await this.dockerService.run({
      image: identifier,
      container,
      detached: true,
      withDelete: false,
      limitations,
    });

    const rawStatsGenerator = this.dockerService.stats(container);
    const rawStats = await asyncGeneratorToArray(rawStatsGenerator);
    const logs = await this.dockerService.logs(container);

    await this.dockerService.deleteContainer(container);
    // await this.metricsService.save(rawStats, logs)
  }

  async registerWatch(
    identifier: string,
    config: TaskConfigDto
  ): Promise<TaskRegisterResult> {
    // TODO: try to clone, build and then run
    return {} as TaskRegisterResult;
  }

  async register(
    identifier: string,
    taskId: number,
    taskConfig: TaskConfigDto
  ): Promise<void> {
    const { config, once } = taskConfig;
    const external = 'repository' in config;

    const taskCronConfig: TaskCronConfig = {
      name: identifier,
      once,
      callback: async () => {
        external
          ? await this.registerWatch(identifier, taskConfig)
          : await this.registerTask(identifier, config.config?.limitations);
      },
      cronString: external ? '*/5 * * * *' : config.local.cronString,
    };

    addTask(taskCronConfig);
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

  async create(
    groupId: number,
    userId: number,
    taskConfig: TaskConfigDto
  ): Promise<void> {
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
  }
}
