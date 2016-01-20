'use strict';

/**
 * super-queue Producer
 *
 * @authro Zongmin Lei <leizongmin@gmail.com>
 */

const EventEmitter = require('events').EventEmitter;
const leiPromise = require('lei-promise');
const utils = require('./utils');
const debug = utils.debug('producer');

class Producer {

  /**
   * Constructor
   *
   * @param {Object} options
   *   - {String} queue
   *   - {Number} maxAge
   *   - {Object} redis
   *     - {String} host
   *     - {Number} port
   *     - {Number} db
   *     - {String} prefix
   */
  constructor(options) {

    if (!options.queue) throw new Error('missing queue name');

    this._redis = utils.createRedisClient(options.redis);
    this.name = utils.generateClientId('producer');
    this._maxAge = options.maxAge || 0;
    this._redisPrefix = (options.redis && options.redis.prefix) || '';
    this.queue = options.queue;
    this._queueKey = this._redisPrefix + options.queue;

    this._msgId = 0;
    this._msgCallback = new EventEmitter();
    const msgCallback = (id, err, result) => this._msgCallback.emit(id, err, result);

    this._redis.subscribe(`${this._redisPrefix}CB:${this.name}`, (chennel, message) => {

      // msg: success => id,s,data    error => id,e,data
      const info = utils.splitString(message, 3);
      if (info.length !== 3) return;

      const id = info[0];
      const type = info[1];

      if (type === 's') {
        let data;
        try {
          data = JSON.parse(info[2]);
        } catch (err) {
          return msgCallback(id, new Error(`JSON.parse(data) fail: ${err.message}`));
        }
        msgCallback(id, null, {result: data});
      } else if (type === 'e') {
        const err = info[2];
        msgCallback(id, new Error(err));
      }

    });

    this.push = leiPromise.promisify(this.push.bind(this));
    this.exit = leiPromise.promisify(this.exit.bind(this));

  }

  /**
   * push to queue
   *
   * @param {Object} info
   *   - {Object} data
   *   - {Number} maxAge
   * @param {Function}
   */
  push(info, callback) {

    info.maxAge = ('maxAge' in info ? info.maxAge : this._maxAge);

    const expire = utils.secondTimestamp() + info.maxAge;
    let data;
    try {
      data = JSON.stringify(info.data);
    } catch (err) {
      return callback(new Error(`JSON.stringify(data) fail: ${err.message}`));
    }

    const id = utils.integerToBase64(++this._msgId);
    // msg: producer,id,expire,data
    const content = `${this.name},${id},${expire},${data}`;

    this._redis.lpush(this._queueKey, content, err => {
      if (err) return callback(err);

      this._msgCallback.once(id, callback);
    });

  }

  /**
   * exit
   *
   * @param {Function} callback
   */
  exit(callback) {
    this._redis.end();
    this._msgCallback = null;
    callback && callback(null);
  }

}

module.exports = Producer;
