import { HttpError } from '@modules/errors/http-errors';

export type ErrorMap = Record<string, typeof HttpError>;
