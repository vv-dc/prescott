import { CommandBuilder } from '@lib/command-builder';

describe('command-builder unit', () => {
  it('should chain commands', () => {
    const builder = new CommandBuilder();

    const actual = builder
      .init('mkdir test')
      .chain('cd "$_"')
      .chain('touch test.ts')
      .chain('ls -la')
      .build();

    const expected = 'mkdir test && cd "$_" && touch test.ts && ls -la';
    expect(actual).toEqual(expected);
  });

  it('should add args and params', () => {
    const builder = new CommandBuilder();
    const actual = builder
      .init('node')
      .arg('r', 'ts-node/register')
      .arg('c')
      .param('trace-warnings')
      .param('max-old-space-size', 100)
      .file('index.js')
      .build();

    const expected =
      'node -r ts-node/register -c --trace-warnings --max-old-space-size=100 index.js';
    expect(actual).toEqual(expected);
  });

  it('should pipe commands', () => {
    const builder = new CommandBuilder();
    const actual = builder
      .init('ls -la')
      .pipe('grep ".*\\.js$"')
      .overwrite('out.txt')
      .build();

    const expected = 'ls -la | grep ".*\\.js$" > out.txt';
    expect(actual).toEqual(expected);
  });

  it('should build complex commands (1)', () => {
    const builder = new CommandBuilder();

    const actual = builder
      .init('mkdir')
      .file('test')
      .chain('cd "$_"')
      .chain('echo "process.exit(1)"')
      .append('index.ts')
      .chain('ls')
      .pipe('cat')
      .overwrite('output.txt')
      .build();

    const expected =
      'mkdir test && cd "$_" && echo "process.exit(1)" >> index.ts && ls | cat > output.txt';
    expect(actual).toEqual(expected);
  });
});
