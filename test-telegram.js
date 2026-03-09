const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 3001,
  path: '/api/telegram-link',
  method: 'GET',
  headers: {
    // Need a valid token. Oh I can just test from the frontend.
  }
});
