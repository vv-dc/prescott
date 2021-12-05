import { kill } from 'process';

const NOT_PERMITTED = 'EPERM';

export const processExists = (pid: number): boolean => {
  try {
    return kill(pid, 0);
  } catch (err) {
    return (err as { code: string }).code === NOT_PERMITTED;
  }
};
