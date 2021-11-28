import { ExecException, ExecOptions, ChildProcess, exec } from 'child_process';
import { promisify } from 'util';

export type ExecCallback = (
  err: ExecException | null,
  stdout: string | Buffer,
  stderr: string | Buffer
) => void;

const execAsync = promisify(exec);

export class CommandBuilder {
  private command = '';

  init(command: string): CommandBuilder {
    this.command = command;
    return this;
  }

  chain(command: string): CommandBuilder {
    if (!this.command) throw new Error('Init command should be provided!');
    this.command += ' && ' + command;
    return this;
  }

  arg(name: string, value?: string | number): CommandBuilder {
    this.command += ` -${name}` + (value ? ` ${value}` : '');
    return this;
  }

  param(name: string, value?: string | number): CommandBuilder {
    this.command += ` --${name}` + (value ? `=${value}` : '');
    return this;
  }

  pipe(command: string): CommandBuilder {
    this.command += ' | ' + command;
    return this;
  }

  file(filename: string): CommandBuilder {
    this.command += ` ${filename}`;
    return this;
  }

  overwrite(filename: string): CommandBuilder {
    this.command += ` > ${filename}`;
    return this;
  }

  append(filename: string): CommandBuilder {
    this.command += ` >> ${filename}`;
    return this;
  }

  build(): string {
    return this.command;
  }

  exec(callback?: ExecCallback, options: ExecOptions = {}): ChildProcess {
    const partialExec = exec.bind(null, this.command, options);
    return callback ? partialExec(callback) : partialExec();
  }

  async execAsync(
    options: ExecOptions = {}
  ): Promise<{ stdout: string; stderr: string; child: ChildProcess }> {
    const promise = execAsync(this.command, options);
    const { stdout, stderr } = await promise;
    return { stdout, stderr, child: promise.child };
  }
}
