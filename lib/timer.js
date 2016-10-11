'use strict';

/**
 * super-queue Timer
 *
 * @authro Zongmin Lei <leizongmin@gmail.com>
 */

const utils = require('./utils');

let counter = 0;

class Timer {

  /**
   * 创建Timer
   *
   * @param {Number} interval 检查周期（毫秒）
   */
  constructor(interval) {
    this.interval = interval || 1000;
    this.list = [];
    this._tid = null;
    this.id = counter += 1;
    this._debug = utils.debug('timer:#' + this.id);
    this._debug('created');
    this.start();
  }

  /**
   * 开始检查
   */
  start() {
    this._tid = setInterval(() => {
      this.check();
    }, this.interval);
  }

  /**
   * 停止检查
   */
  stop() {
    clearInterval(this._tid);
    this._tid = null;
  }

  /**
   * 添加回调函数，超过指定时间即执行
   *
   * @param {Number} expire 秒时间戳
   * @param {Function} callback 回调函数
   */
  add(expire, callback) {
    this.list.push({ expire, callback });
  }

  /**
   * 检查已到期的函数，并执行
   */
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

  /**
   * 销毁当前Timer
   */
  destroy() {
    this.stop();
    this.list = [];
  }

}

module.exports = Timer;
