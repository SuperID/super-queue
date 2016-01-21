'use strict';

/**
 * super-queue Producer
 *
 * @authro Zongmin Lei <leizongmin@gmail.com>
 */

const EventEmitter = require('events').EventEmitter;
const leiPromise = require('lei-promise');
const utils = require('./utils');

class Producer extends EventEmitter {

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
    super();

    if (!options.queue) throw new Error('missing queue name');

    this._redis = utils.createRedisClient(options.redis);
    this._redisSub = utils.createRedisClient(options.redis);
    this.name = utils.generateClientId('producer');
    this._redisPrefix = (options.redis && options.redis.prefix) || '';
    this.queue = options.queue;
    this._queueKey = utils.getQueueKey(this._redisPrefix, options.queue);

    this._maxAge = options.maxAge || 0;

    this._msgId = 0;
    this._msgCallback = new EventEmitter();
    const msgCallback = (id, err, result) => this._msgCallback.emit(id, err, result);

    const callbackKey = utils.getCallbackKey(this._redisPrefix, this.name);
    this._redisSub.subscribe(callbackKey, (channel, count) => {
      this._debug('on subscribe: chennel=%s, count=%s', channel, count);
      this.emit('start');
    });

    this._redisSub.on('message', (chennel, message) => {
      this._debug('on reply: %s -> %s', chennel, message);

      // msg: success => id,s,data    error => id,e,data
      const info = utils.splitString(message, ',', 3);
      if (info.length !== 3) return;

      const id = info[0];
      const type = info[1];
      const data = info[2];

      if (type === 's') {
        msgCallback(id, null, {result: data});
      } else if (type === 'e') {
        const err = info[2];
        msgCallback(id, new Error(err));
      }

    });

    //this.push = leiPromise.promisify(this.push.bind(this));
    //this.exit = leiPromise.promisify(this.exit.bind(this));

    this._debug = utils.debug('producer:' + this.name);
    this._debug('created: queue=%s, maxAge=%s, redis=%j', this.queue, this._maxAge, options.redis);

  }

  /**
   * push to queue
   *
   * @param {Object} info
   *   - {String} data
   *   - {Number} maxAge
   * @param {Function}
   */
  push(info, callback) {

    if (typeof info.data !== 'string') {
      return callback(new TypeError('`data` must be string'));
    }
    if ('maxAge' in info && !(info.maxAge >= 0)) {
      return callback(new TypeError('`maxAge` must be nonnegative number'));
    }

    info.maxAge = ('maxAge' in info ? info.maxAge : this._maxAge);
    const expire = (info.maxAge > 0 ? utils.secondTimestamp() + info.maxAge : 0);

    const id = utils.integerToShortString(++this._msgId, 4);
    // msg: producer,id,expire,data
    const content = `${this.name},${id},${expire},${info.data}`;
    this._debug('new msg: %s <- %s', this._queueKey, content);

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
    this._redisSub.end();
    this._msgCallback = null;
    callback && callback(null);
  }

}

module.exports = Producer;
