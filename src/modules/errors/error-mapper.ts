import { ErrorMap } from '@modules/errors/model/error-map';
import {
  EntityConflict,
  AccessDenied,
  EntityNotFound,
  UnauthorizedUser,
  BadRequest,
} from '@modules/errors/abstract-errors';
import {
  HttpError,
  HttpConflict,
  HttpForbidden,
  HttpNotFound,
  HttpUnauthorized,
  HttpBadRequest,
} from '@modules/errors/http-errors';

const errorMap: ErrorMap = {
  [EntityConflict.name]: HttpConflict,
  [AccessDenied.name]: HttpForbidden,
  [EntityNotFound.name]: HttpNotFound,
  [UnauthorizedUser.name]: HttpUnauthorized,
  [BadRequest.name]: HttpBadRequest,
};

export const mapError = (error: Error): HttpError => {
  const { name, message } = error;
  return name in errorMap ? new errorMap[name](message) : (error as HttpError);
};
