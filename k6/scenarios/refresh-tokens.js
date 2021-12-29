import { check } from 'k6';
import {
  loginRequest,
  logoutRequest,
  refreshTokensRequest,
  registerRequest,
} from '../lib/http.utils.js';
import { generateRandomUser } from '../lib/data.utils.js';

export default function refreshTokens() {
  const user = generateRandomUser();

  const registerResponse = registerRequest(user);
  check(registerResponse, {
    'After register status 200:': (r) => r && r.status === 200,
  });

  const { login, password } = user;
  const loginResponse = loginRequest({ login, password });
  const { refreshToken: oldRefreshToken } = JSON.parse(loginResponse.body);

  check(loginResponse, {
    'After login status 200:': (r) => r && r.status === 200,
  });

  const refreshResponse = refreshTokensRequest(oldRefreshToken);
  const { refreshToken: newRefreshToken } = JSON.parse(refreshResponse.body);

  check(refreshResponse, {
    'After refresh status 200:': (r) => r && r.status === 200,
  });

  const logoutResponse = logoutRequest(newRefreshToken);
  check(logoutResponse, {
    'After logout status 204': (r) => r && r.status === 204,
  });
}
