'use strict';

/**
 * super-queue
 *
 * @authro Zongmin Lei <leizongmin@gmail.com>
 */

const Promise = require('bluebird');

const BaseConsumer = exports.Consumer = require('./consumer');
const BaseProducer = exports.Producer = require('./producer');
const BaseMonitor = exports.Monitor = require('./monitor');

// ------------------------------ 返回 Promise 版本的类 --------------------------
exports.promise = {};

exports.promise.Consumer = class Consumer extends BaseConsumer {
  exit() {
    return new Promise((resolve, reject) => {
      super.exit(err => {
        err ? reject(err) : resolve();
      });
    });
  }
};

exports.promise.Producer = class Producer extends BaseProducer {
  push(info) {
    return new Promise((resolve, reject) => {
      super.push(info, (err, ret) => {
        err ? reject(err) : resolve(ret);
      });
    });
  }
  exit() {
    return new Promise((resolve, reject) => {
      super.exit(err => {
        err ? reject(err) : resolve();
      });
    });
  }
};

exports.promise.Monitor = class Monitor extends BaseMonitor {
  check() {
    return new Promise((resolve, reject) => {
      super.check(err => {
        err ? reject(err) : resolve();
      });
    });
  }
  clientStatus() {
    return new Promise((resolve, reject) => {
      super.clientStatus(err => {
        err ? reject(err) : resolve();
      });
    });
  }
  queueStatus() {
    return new Promise((resolve, reject) => {
      super.queueStatus(err => {
        err ? reject(err) : resolve();
      });
    });
  }
  withdrawnProcessingQueue() {
    return new Promise((resolve, reject) => {
      super.withdrawnProcessingQueue((err, ret) => {
        err ? reject(err) : resolve(ret);
      });
    });
  }
  exit() {
    return new Promise((resolve, reject) => {
      super.exit(err => {
        err ? reject(err) : resolve();
      });
    });
  }
};
