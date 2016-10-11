'use strict';

/**
 * super-queue example
 *
 * @authro Zongmin Lei <leizongmin@gmail.com>
 */

const Consumer = require('../').Consumer;

const c = new Consumer({
  queue: 'test1',
  redis: {
    host: '127.0.0.1',
    port: 6379,
    prefix: 'example:',
  },
  capacity: 10,
});

c.listen(msg => {
  console.log(msg);
  // msg.resolve('fuck');
  setTimeout(() => msg.resolve(`fuck ${ msg.data }`), Math.random() * 1000);
});
