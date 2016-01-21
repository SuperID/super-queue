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

p.on('start', () => {
  console.log('start');

  let count = 0;

  for (let i = 0; i < 1000; i++) {
    p.push({
      data: `hello ${i} times`,
    }, (err, ret) => {
      console.log(count++, err, ret);
    });
  }

});
