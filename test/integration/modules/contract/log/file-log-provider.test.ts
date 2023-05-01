import { generateRandomString } from '@lib/random.utils';
import { LogProviderContract } from '@modules/contract/model/log-provider.contract';
import { LogEntry } from '@modules/contract/model/log-entry';
import fileLogProviderBuilder from '@src/workdir/contract/log/file-log-provider';
import { generateTaskRunHandle } from '@test/lib/test-data.utils';

const buildLogProvider = async (): Promise<LogProviderContract> => {
  const logProvider = await fileLogProviderBuilder.buildContract();
  await logProvider.init({ workDir: __dirname });
  return logProvider;
};

describe('file-log-generator integration', () => {
  it('save and then return logs', async () => {
    const logProvider = await buildLogProvider();
    const LOG_ENTRIES_NUMBER = 100;
    const generatedLogs: LogEntry[] = [];

    const logsGenerator = async function* (): AsyncGenerator<LogEntry> {
      for (let idx = 0; idx < LOG_ENTRIES_NUMBER; ++idx) {
        const logEntry: LogEntry = {
          stream: 'stdout',
          content: generateRandomString('log'),
          time: new Date().getTime(),
        };
        generatedLogs.push(logEntry);
        yield logEntry;
      }
    };

    const runHandle = generateTaskRunHandle();
    await logProvider.consumeLogGenerator(runHandle, logsGenerator());

    const { next, entries } = await logProvider.searchLog(
      runHandle,
      { pageSize: LOG_ENTRIES_NUMBER },
      {}
    );
    expect(entries).toHaveLength(LOG_ENTRIES_NUMBER);
    expect(entries).toEqual(expect.arrayContaining(generatedLogs));
    expect(next).toEqual(LOG_ENTRIES_NUMBER + 1);

    await logProvider.flushLog(runHandle);
  });

  it('should search logs by date', async () => {
    const logProvider = await buildLogProvider();
    const generatedLogs: LogEntry[] = [];

    const generator = async function* (): AsyncGenerator<LogEntry> {
      for (let idx = 0; idx < 30; ++idx) {
        const logEntry: LogEntry = {
          stream: 'stdout',
          content: `log-${idx}`,
          time: new Date(
            `2023-01-${(idx + 1).toString().padStart(2, '0')}`
          ).getTime(),
        };
        generatedLogs.push(logEntry);
        yield logEntry;
      }
    };

    const runHandle = generateTaskRunHandle();
    await logProvider.consumeLogGenerator(runHandle, generator());

    const { entries, next } = await logProvider.searchLog(
      runHandle,
      { pageSize: 10, from: 3 },
      {
        fromDate: new Date('2023-01-15'),
        toDate: new Date('2023-01-30'),
      }
    );
    expect(entries).toHaveLength(10);
    expect(entries).toEqual(generatedLogs.slice(17, 27));
    expect(next).toEqual(14);

    await logProvider.flushLog(runHandle);
  });

  it('should search logs by pattern', async () => {
    const logProvider = await buildLogProvider();
    const generatedLogs: LogEntry[] = [];

    const generator = async function* (): AsyncGenerator<LogEntry> {
      for (let idx = 0; idx < 30; ++idx) {
        const prefix = idx % 2 === 0 ? 'even' : 'odd';
        const logEntry: LogEntry = {
          stream: 'stdout',
          content: `${prefix}-${idx}`,
          time: new Date().getTime(),
        };
        generatedLogs.push(logEntry);
        yield logEntry;
      }
    };

    const runHandle = generateTaskRunHandle();
    await logProvider.consumeLogGenerator(runHandle, generator());

    const { entries, next } = await logProvider.searchLog(
      runHandle,
      { pageSize: 4 },
      { searchTerm: '^even-[1238]+$' }
    );
    expect(entries).toHaveLength(4);
    expect(entries).toEqual([
      generatedLogs[2],
      generatedLogs[8],
      generatedLogs[12],
      generatedLogs[18],
    ]);
    expect(next).toEqual(5);

    await logProvider.flushLog(runHandle);
  });
});
