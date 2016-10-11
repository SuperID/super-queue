'use strict';

/**
 * super-queue test
 *
 * @authro Zongmin Lei <leizongmin@gmail.com>
 */

const assert = require('assert');
const Consumer = require('../').Consumer;
const Producer = require('../').Producer;
const PromiseConsumer = require('../').promise.Consumer;
const PromiseProducer = require('../').promise.Producer;
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

function exit() {
  const args = Array.prototype.slice.call(arguments);
  const done = args.pop();
  Promise.all(args).then(ret => done()).catch(done);
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
      p.push({ data: 'hello' }, (err, ret) => {
        assert.equal(err, null);
        assert.equal(ret.result, 'ok');

        assert.equal(status.received, true);
        exit(c.exit(), p.exit(), done);
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
      p.push({ data: 'hello' }, (err, ret) => {
        assert.equal(err.message, 'fail');

        assert.equal(status.received, true);
        exit(c.exit(), p.exit(), done);
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
      p.push({ data: 'hello', maxAge: 1 }, (err, ret) => {
        assert.equal(err.code, 'msg_expired');

        exit(c.exit(), p.exit(), done);
      });
    });

  });

  it('#4 many messages', function (done) {

    const options = generateOptions();
    const c = new Consumer(merge(options, {}));
    const p = new Producer(merge(options, {}));

    let count = 0;
    c.listen(msg => {
      assert.equal(msg.data, count.toString());
      count++;
      msg.resolve(count.toString());
    });

    p.on('start', () => {
      const MAX = 10000;
      let retCount = 0;
      for (let i = 0; i < MAX; i++) {
        p.push({ data: i.toString() }, (err, ret) => {
          assert.equal(err, null);
          retCount++;
          check();
        });
      }

      function check() {
        if (retCount === MAX) {
          assert.equal(count, MAX);
          exit(c.exit(), p.exit(), done);
        }
      }
    });

  });

  it('#5 promise method', function (done) {

    const options = generateOptions();
    const c = new PromiseConsumer(merge(options, {}));
    const p = new PromiseProducer(merge(options, {}));

    const status = {};

    c.listen(msg => {
      status.received = true;
      assert.equal(msg.data, 'hello');
      msg.resolve('ok');
    });

    p.on('start', () => {
      p.push({ data: 'hello' })
        .then(ret => {
          assert.equal(ret.result, 'ok');
          assert.equal(status.received, true);

          exit(c.exit(), p.exit(), done);
        })
        .catch(done);
    });

  });

  it('#5 promise method #asCallback', function (done) {

    const options = generateOptions();
    const c = new PromiseConsumer(merge(options, {}));
    const p = new PromiseProducer(merge(options, {}));

    const status = {};

    c.listen(msg => {
      status.received = true;
      assert.equal(msg.data, 'hello');
      msg.resolve('ok');
    });

    p.on('start', () => {
      p.push({ data: 'hello' }).asCallback((err, ret) => {
        assert.equal(err, null);
        assert.equal(ret.result, 'ok');
        assert.equal(status.received, true);
        exit(c.exit(), p.exit(), done);
      });
    });

  });

});
