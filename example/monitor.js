'use strict';

/**
 * super-queue example
 *
 * @authro Zongmin Lei <leizongmin@gmail.com>
 */

const Monitor = require('../').Monitor;

const m = new Monitor({
  queue: 'test1',
  redis: {
    host: '127.0.0.1',
    port: 6379,
    prefix: 'example:',
  },
});


//setInterval(() => m.clientStatus(console.log), 2000);
setInterval(() => m.queueStatus(console.log), 2000);
