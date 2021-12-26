import { Limitations } from '@model/domain/limitations';

export type MappedLimitation = Exclude<keyof Limitations, 'ttl'>;
