import http from 'k6/http';
import { config } from '../config/config.js';

const { baseUrl } = config;

const composeHeaders = (accessToken) => ({
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${accessToken}`,
  },
});

export const registerRequest = ({ login, email, fullName, password }) => {
  const payload = JSON.stringify({ login, email, fullName, password });
  return http.post(`${baseUrl}/auth/register`, payload, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export const loginRequest = ({ login, password }) => {
  const payload = JSON.stringify({ login, password });
  return http.post(`${baseUrl}/auth/login`, payload, composeHeaders());
};

export const createGroupRequest = (groupName, accessToken) => {
  const payload = JSON.stringify({ groupName });
  return http.post(`${baseUrl}/groups`, payload, composeHeaders(accessToken));
};

export const createTaskRequest = (groupId, taskConfig, accessToken) => {
  const url = `${baseUrl}/groups/${groupId}/tasks`;
  const payload = JSON.stringify(taskConfig);
  return http.post(url, payload, composeHeaders(accessToken));
};

export const deleteTaskRequest = (groupId, taskId, accessToken) => {
  const url = `${baseUrl}/groups/${groupId}/tasks/${taskId}`;
  return http.del(url, '', composeHeaders(accessToken));
};

export const addRoleRequest = (groupId, userId, role, accessToken) => {
  const url = `${baseUrl}/groups/${groupId}/users/${userId}/roles`;
  const payload = JSON.stringify({ role });
  return http.post(url, payload, composeHeaders(accessToken));
};

export const refreshTokensRequest = (refreshToken) => {
  const url = `${baseUrl}/auth/refresh-tokens`;
  const payload = JSON.stringify({ refreshToken });
  return http.post(url, payload, composeHeaders());
};

export const logoutRequest = (refreshToken) => {
  const url = `${baseUrl}/auth/logout`;
  const payload = JSON.stringify({ refreshToken });
  return http.post(url, payload, composeHeaders(refreshToken));
};
