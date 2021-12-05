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
      .with('index.js')
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
      .overwriteFile('out.txt')
      .build();

    const expected = 'ls -la | grep ".*\\.js$" > out.txt';
    expect(actual).toEqual(expected);
  });

  it('should build complex commands (1)', () => {
    const builder = new CommandBuilder();

    const actual = builder
      .init('mkdir')
      .with('test')
      .chain('cd "$_"')
      .chain('echo "process.exit(1)"')
      .appendToFile('index.ts')
      .chain('ls')
      .pipe('cat')
      .overwriteFile('output.txt')
      .build();

    const expected =
      'mkdir test && cd "$_" && echo "process.exit(1)" >> index.ts && ls | cat > output.txt';
    expect(actual).toEqual(expected);
  });
});
