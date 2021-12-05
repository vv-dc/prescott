import { DockerService } from '@plugins/docker/docker.service';
import { TaskDao } from '@plugins/task/task.dao';

export class TaskService {
  constructor(private dao: TaskDao, private dockerService: DockerService) {}
}
