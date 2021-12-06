import { DockerService } from '@plugins/docker/docker.service';
import { TaskDao } from '@plugins/task/task.dao';
import { buildDockerCmd, buildTaskIdentifier } from '@plugins/task/task.utils';
import { asyncGeneratorToArray } from '@lib/async.utils';
import { generateRandomString } from '@lib/random.utils';
import { Step, TaskConfig } from '@model/domain/task-config';
import { Limitations } from '@model/domain/limitations';
import { TaskRegisterResult } from '@plugins/task/task.model';
import { OsInfo } from '@model/domain/os-info';
import { schedule } from 'node-cron';

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
    config: TaskConfig
  ): Promise<TaskRegisterResult> {
    // TODO: try to clone, build and then run
    return {} as TaskRegisterResult;
  }

  async register(
    identifier: string,
    taskId: number,
    config: TaskConfig
  ): Promise<void> {
    const { repository, cronString, limitations } = config;
    const external = repository !== undefined;

    if (external) {
      schedule('*/5 * * * *', async () => {
        await this.registerWatch(identifier, config);
      });
    } else {
      schedule(cronString as string, async () => {
        await this.registerTask(identifier, limitations);
      });
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

  async create(
    groupId: number,
    userId: number,
    config: TaskConfig
  ): Promise<void> {
    const { name, osInfo, repository, steps, limitations } = config;
    const clearTask = repository === undefined;
    const identifier = buildTaskIdentifier(groupId, name);

    await this.dao.create({
      userId,
      groupId,
      name: identifier,
      config: JSON.stringify(config),
    });

    if (clearTask) {
      await this.buildClearTask(identifier, osInfo, steps as Step[]);
      await this.registerTask(identifier, limitations);
    } else await this.registerWatch(identifier, config);
  }
}
