import { Contract } from '@modules/contract/model/contract';

export interface TaskSchedulerContract extends Contract {
  schedule(taskId: number, dto: ScheduleTaskDto): Promise<void>;
  start(taskId: number): Promise<void>;
  stop(taskId: number): Promise<void>;
  delete(taskId: number): Promise<void>;
  exists(taskId: number): Promise<boolean>;
}

export interface ScheduleTaskDto {
  configString: string;
  callback: () => Promise<void>;
}
