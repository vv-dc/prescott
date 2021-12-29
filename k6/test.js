export { default as refreshTokens } from './scenarios/refresh-tokens.js';

export const options = {
  scenarios: {
    refreshTokens: {
      executor: 'ramping-vus',
      stages: [
        { target: 100, duration: '10s' },
        { target: 100, duration: '10s' },
        { target: 0, duration: '15s' },
      ],
      exec: 'refreshTokens',
    },
  },
  thresholds: {
    http_req_duration: ['p(90)<300'],
    http_req_failed: ['rate<0.01'],
  },
};

export const setup = () => {
  console.log('Set up started');
};
