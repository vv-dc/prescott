import { pino } from 'pino';
import { config, PRESCOTT_CONFIG } from '@config/config';

const { logLevel } = config[PRESCOTT_CONFIG];
const logger = pino({ level: logLevel });

export const getLogger = (name: string) => {
  return logger.child({ name });
};
