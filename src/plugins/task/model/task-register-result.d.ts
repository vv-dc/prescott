import { RawStat } from '@plugins/docker/docker.model';

export interface TaskRegisterResult {
  rawStats: RawStat[];
  logs: {
    stdout: string;
    stderr: string;
  };
}
