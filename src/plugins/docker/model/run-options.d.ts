import { DockerRunDto } from '@model/dto/docker-run.dto';

export type RunOptions = Omit<
  DockerRunDto,
  'image' | 'container' | 'limitations'
>;
