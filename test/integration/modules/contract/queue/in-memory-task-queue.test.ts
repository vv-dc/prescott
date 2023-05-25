import { setTimeout } from 'node:timers/promises';
import {
  ExecuteTaskFn,
  TaskQueueContract,
} from '@modules/contract/model/task-queue.contract';
import taskQueueBuilder from '@src/workdir/contract/queue/in-memory-task-queue';
const buildTaskQueue = async (
  maxConcurrency: number
): Promise<TaskQueueContract> => {
  const taskQueue = await taskQueueBuilder.buildContract();
  await taskQueue.init({
    workDir: __dirname,
    maxConcurrency,
  });
  return taskQueue;
};

describe('in-memory-task-queue integration', () => {
  it('should run more no more than maxConcurrency tasks simultaneously', async () => {
    const maxConcurrency = 2;
    const executorsNum = 5;

    const taskQueue = await buildTaskQueue(maxConcurrency);
    const lockers: boolean[] = [];
    const executorFns: ExecuteTaskFn[] = [];

    for (let idx = 0; idx < executorsNum; ++idx) {
      lockers.push(true);
      const executorFn = jest.fn(async () => {
        while (lockers[idx]) {
          await setTimeout(100);
        }
      });
      executorFns.push(executorFn);
      await taskQueue.enqueue(idx, executorFn);
    }

    // capacity only for the first two
    expect(executorFns[0]).toBeCalled();
    expect(executorFns[1]).toBeCalled();
    expect(executorFns[2]).not.toBeCalled();
    expect(executorFns[3]).not.toBeCalled();
    expect(executorFns[4]).not.toBeCalled();

    // free one
    lockers[0] = false;
    await setTimeout(1_000); // wait for unlock
    expect(executorFns[2]).toBeCalled();
    expect(executorFns[3]).not.toBeCalled(); // still no capacity
    expect(executorFns[4]).not.toBeCalled(); // still no capacity

    // free one more
    lockers[1] = false;
    await setTimeout(1_000);
    expect(executorFns[3]).toBeCalled();
    expect(executorFns[4]).not.toBeCalled();

    // free all
    for (let idx = 0; idx < executorsNum; ++idx) lockers[idx] = false;
    await setTimeout(1_000);
    expect(executorFns[4]).toBeCalled();
  });
});
