import { EntityConflict } from '@modules/errors/abstract-errors';
import { HttpError, HttpConflict } from '@modules/errors/http-errors';
import { ErrorMap } from '@modules/errors/model/error-map';

const errorMap: ErrorMap = {
  [EntityConflict.name]: HttpConflict,
};

export const mapError = (error: Error): HttpError => {
  const { name, message } = error;
  return name in errorMap ? new errorMap[name](message) : (error as HttpError);
};
