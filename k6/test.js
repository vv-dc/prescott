import { generateRandomString, generateRandomUser } from './lib/data.utils.js';
import {
  createGroupRequest,
  loginRequest,
  registerRequest,
} from './lib/http.utils.js';

export { default as refreshTokens } from './scenarios/refresh-tokens.js';
export { default as createTask } from './scenarios/create-task.js';

export const options = {
  scenarios: {
    refreshTokens: {
      executor: 'ramping-vus',
      stages: [
        { duration: '3s', target: 50 },
        { duration: '10s', target: 50 },
        { duration: '3s', target: 100 },
        { duration: '10s', target: 100 },
        { duration: '3s', target: 200 },
        { duration: '10s', target: 200 },
        { duration: '15s', target: 0 },
      ],
      exec: 'refreshTokens',
      tags: { test_name: 'refresh-tokens' },
    },
    createTask: {
      executor: 'constant-vus',
      vus: 5,
      duration: '20s',
      exec: 'createTask',
    },
  },
  thresholds: {
    'http_req_duration{scenario:refreshTokens}': [
      'p(90) < 4000',
      'p(95) < 5000',
    ],
    'http_req_failed{scenario:refreshTokens}': ['rate<0.01'],
    'http_req_duration{scenario:createTask}': ['p(90) < 3000', 'p(95) < 3500'],
    'http_req_failed{scenario:createTask}': ['rate<0.01'],
  },
};

export const setup = () => {
  const user = generateRandomUser();
  registerRequest(user);

  const { login, password } = user;
  const loginResponse = loginRequest({ login, password });
  const { accessToken } = JSON.parse(loginResponse.body);

  const groupName = generateRandomString(30);
  const groupResponse = createGroupRequest(groupName, accessToken);
  const { groupId } = JSON.parse(groupResponse.body);

  return { accessToken, groupId };
};
