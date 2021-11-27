import { config, SERVER_CONFIG } from '@config/config';

it('server config should be truthy', () => {
  expect(config[SERVER_CONFIG]).toBeTruthy();
});
