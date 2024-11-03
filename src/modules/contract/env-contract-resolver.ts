import { EnvContractResolver } from './model/contract-config';
import { EnvBuilderContract } from './model/env/env-builder.contract';
import { EnvRunnerContract } from './model/env/env-runner.contract';

export type EnvContractPairMap = Partial<
  Record<string, [EnvBuilderContract, EnvRunnerContract]> // runnerName : pair
>;

export class EnvContractResolverDefault implements EnvContractResolver {
  constructor(
    private readonly defaultRunnerName: string,
    private readonly pairsMap: EnvContractPairMap
  ) {}

  getBuilder(runnerName: string | null): EnvBuilderContract {
    const pair = this.getPairThrowable(runnerName);
    return pair[0];
  }

  getRunner(runnerName: string | null): EnvRunnerContract {
    const pair = this.getPairThrowable(runnerName);
    return pair[1];
  }

  private getPairThrowable(
    runnerName: string | null
  ): [EnvBuilderContract, EnvRunnerContract] {
    const inferredName = runnerName || this.defaultRunnerName;
    const pair = this.pairsMap[inferredName];
    if (!pair) {
      throw new Error(`Unable to resolve EnvRunner[name=${inferredName}`);
    }
    return pair;
  }
}
