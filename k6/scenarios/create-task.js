import { check, sleep } from 'k6';

import { generateRandomString } from '../lib/data.utils.js';
import { taskConfig } from '../data/task-config.js';
import { createTaskRequest, deleteTaskRequest } from '../lib/http.utils.js';

export default function createTask({ groupId, accessToken }) {
  const config = Object.assign({}, taskConfig);
  config.name = generateRandomString(30);

  const taskResponse = createTaskRequest(groupId, config, accessToken);
  check(taskResponse, {
    'After create task status 201': (r) => r && r.status === 201,
  });

  sleep(1); // let some tasks execute

  const { taskId } = JSON.parse(taskResponse.body);
  const deleteResponse = deleteTaskRequest(groupId, taskId, accessToken);
  check(deleteResponse, {
    'After delete status 204': (r) => r && r.status === 204,
  });
}
