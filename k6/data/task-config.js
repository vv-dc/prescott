export const taskConfig = {
  name: 'task_name',
  osInfo: {
    name: 'alpine',
    version: 3.15,
  },
  config: {
    local: {
      cronString: '*/2 * * * * *', // every 2 seconds
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
