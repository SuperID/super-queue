'use strict';

/**
 * super-queue test
 *
 * @authro Zongmin Lei <leizongmin@gmail.com>
 */

const assert = require('assert');
const Consumer = require('../').Consumer;
const Producer = require('../').Producer;
const Monitor = require('../').Monitor;
const utils = require('../lib/utils');

function generateOptions(options) {
  options = options || {};
  options.queue = utils.date('Ymd_His_') + utils.randomString(10);
  options.redis = {
    host: '127.0.0.1',
    port: 6379,
    db: 15,
    prefix: 'TEST:',
  };
  return options;
}

function merge(a, b) {
  return Object.assign(b, a);
}

describe('normal', function () {

  it('#1 push & pull success', function (done) {

    const options = generateOptions();
    const c = new Consumer(merge(options, {}));
    const p = new Producer(merge(options, {}));

    const status = {};

    c.listen(msg => {
      status.received = true;
      assert.equal(msg.data, 'hello');
      msg.resolve('ok');
    });

    p.on('start', () => {
      p.push({data: 'hello'}, (err, ret) => {
        assert.equal(err, null);
        assert.equal(ret.result, 'ok');

        assert.equal(status.received, true);
        done();
      });
    });

  });

  it('#2 push & pull error', function (done) {

    const options = generateOptions();
    const c = new Consumer(merge(options, {}));
    const p = new Producer(merge(options, {}));

    const status = {};

    c.listen(msg => {
      status.received = true;
      assert.equal(msg.data, 'hello');
      msg.reject('fail');
    });

    p.on('start', () => {
      p.push({data: 'hello'}, (err, ret) => {
        assert.equal(err.message, 'fail');

        assert.equal(status.received, true);
        done();
      });
    });

  });

  it('#3 push & pull expired', function (done) {

    const options = generateOptions();
    const c = new Consumer(merge(options, {}));
    const p = new Producer(merge(options, {}));

    setTimeout(() => {
      c.listen(msg => {
        assert.equal(msg.data, 'hello');
      });
    }, 2000);

    p.on('start', () => {
      p.push({data: 'hello', maxAge: 1}, (err, ret) => {
        assert.equal(err.code, 'msg_expired');

        done();
      });
    });

  });

});
