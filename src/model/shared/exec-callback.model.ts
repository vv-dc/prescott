import { ExecException } from 'child_process';

export type ExecCallback = (
  err: ExecException | null,
  stdout: string | Buffer,
  stderr: string | Buffer
) => void;
