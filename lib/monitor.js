'use strict';

/**
 * super-queue Monitor
 *
 * @authro Zongmin Lei <leizongmin@gmail.com>
 */

const EventEmitter = require('events').EventEmitter;
const leiPromise = require('lei-promise');
const utils = require('./utils');

// content: startedAt,msgTotal,msgSuccess,msgError,msgExpired,capacity,processingCount
function parseConsumerInfo(name, content) {
  const info = utils.splitString(content, ',', 7);
  const ret = {
    name: name,
    startedAt: Number(info[0]),
    msgTotal: Number(info[1]),
    msgSuccess: Number(info[2]),
    msgError: Number(info[3]),
    msgExpired: Number(info[4]),
    capacity: Number(info[5]),
    processingCount: Number(info[6]),
  };
  return ret;
}

// content: startedAt,msgTotal,msgSuccess,msgError,msgExpired
function  parseProducerInfo(name, content) {
  const info = utils.splitString(content, ',', 5);
  const ret = {
    name: name,
    startedAt: Number(info[0]),
    msgTotal: Number(info[1]),
    msgSuccess: Number(info[2]),
    msgError: Number(info[3]),
    msgExpired: Number(info[4]),
  };
  return ret;
}

class Monitor extends EventEmitter {

  /**
   * Constructor
   *
   * @param {Object} options
   *   - {Number} interval
   *   - {Object} redis
   *     - {String} host
   *     - {Number} port
   *     - {Number} db
   *     - {String} prefix
   */
  constructor(options) {
    super();

    this._redis = utils.createRedisClient(options.redis);
    this.name = utils.generateClientId('monitor');
    this._redisPrefix = (options.redis && options.redis.prefix) || '';

    this._interval = options.interval || 5;

    this._debug = utils.debug('monitor:' + this.name);
    this._debug('created: interval=%s, redis=%j', this._interval, options.redis);

    this._startedAt = utils.secondTimestamp();

  }

  /**
   * get client status
   *
   * @param {Function} callback
   */
  clientStatus(callback) {

    const heartbeatKey = utils.getHeartbeatKey(this._redisPrefix, '*');
    this._redis.keys(heartbeatKey, (err, keys) => {
      if (err) return callback(err);

      if (keys.length < 1) {
        return callback(null, {producers: [], consumers: []});
      }

      this._redis.mget(keys, (err, values) => {
        if (err) return callback(err);

        const producers = [];
        const consumers = [];

        for (let i = 0; i < keys.length; i++) {
          if (values[i]) {
            const s = keys[i].split(':').slice(-2);
            if (s[0] === 'C') {
              consumers.push(parseConsumerInfo(s[1], values[i]));
            } else if (s[0] === 'P') {
              producers.push(parseProducerInfo(s[1], values[i]));
            }
          }
        }

        const timestamp = utils.secondTimestamp();
        for (let item of producers) {
          item.uptime = timestamp - item.startedAt;
        }
        for (let item of consumers) {
          item.uptime = timestamp - item.startedAt;
        }

        callback(null, {producers, consumers});
      });
    });

  }

  /**
   * exit
   *
   * @param {Function} callback
   */
  exit(callback) {
    this._redis.end();
    callback && callback(null);
  }

}

module.exports = Monitor;
