'use strict';

/**
 * super-queue example
 *
 * @authro Zongmin Lei <leizongmin@gmail.com>
 */

const Producer = require('../').Producer;

const p = new Producer({
  queue: 'test1',
  redis: {
    host: '127.0.0.1',
    port: 6379,
    prefix: 'example:',
  }
});
