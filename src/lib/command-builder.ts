import { ExecOptions, ChildProcess, exec } from 'child_process';
import { promisify } from 'util';
import { ExecCallback } from '@model/shared/exec-callback.model';

const execAsync = promisify(exec);

export class CommandBuilder {
  private command = '';

  init(command: string): CommandBuilder {
    this.command = command;
    return this;
  }

  chain(command: string): CommandBuilder {
    this.command += ' && ' + command;
    return this;
  }

  arg(name: string, value?: string | number): CommandBuilder {
    this.command += ` -${name}` + (value ? ` ${value}` : '');
    return this;
  }

  param(name: string, value?: string | number | boolean): CommandBuilder {
    this.command += ` --${name}` + (value ? `=${value}` : '');
    return this;
  }

  pipe(command: string): CommandBuilder {
    this.command += ' | ' + command;
    return this;
  }

  with(param: unknown): CommandBuilder {
    this.command += ` ${param}`;
    return this;
  }

  overwriteFile(filename: string): CommandBuilder {
    this.command += ` > ${filename}`;
    return this;
  }

  appendToFile(filename: string): CommandBuilder {
    this.command += ` >> ${filename}`;
    return this;
  }

  prepend(command: string): CommandBuilder {
    this.command = `${command} ${this.command}`;
    return this;
  }

  merge(builder: CommandBuilder): CommandBuilder {
    const merged = new CommandBuilder();
    return merged.init(this.command).with(builder.build());
  }

  then(command: string): CommandBuilder {
    this.command += ` ;${command}`;
    return this;
  }

  thenExec(command: string): CommandBuilder {
    this.command += ` ;exec ${command}`;
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
