export const taskConfig = {
  name: 'task_name',
  osInfo: {
    name: 'alpine',
    version: 3.15,
  },
  once: true,
  config: {
    local: {
      cronString: '*/10 * * * * *', // every 10 seconds
    },
    appConfig: {
      steps: [
        {
          name: 'first',
          script: 'ZWNobyBoZWxsbyB3b3JsZA==', // echo hello world
        },
      ],
    },
  },
};
