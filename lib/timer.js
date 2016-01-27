'use strict';

/**
 * super-queue Timer
 *
 * @authro Zongmin Lei <leizongmin@gmail.com>
 */

const EventEmitter = require('events').EventEmitter;
const utils = require('./utils');

let counter = 0;

class Timer {

  constructor(interval) {

    this.interval = interval || 1000;
    this.list = [];
    this._tid = setInterval(() => {
      this.check();
    }, this.interval);

    this.id = counter++;
    this._debug = utils.debug('timer:#' + this.id);
    this._debug('created');

  }

  add(expire, callback) {
    this.list.push({expire, callback});
  }

  check() {
    const now = utils.secondTimestamp();
    this.list.sort((a, b) => a.expire - b.expire);
    let i = 0;
    for (; i < this.list.length; i++) {
      const item = this.list[i];
      if (item.expire > now) break;
    }
    const expires = this.list.slice(0, i);
    this.list = this.list.slice(i);
    for (const item of expires) {
      item.callback(item.expire);
    }
  }

  destroy() {
    clearInterval(this._tid);
  }

}

module.exports = Timer;
