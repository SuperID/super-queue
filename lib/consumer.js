'use strict';

/**
 * super-queue Consumer
 *
 * @authro Zongmin Lei <leizongmin@gmail.com>
 */

const EventEmitter = require('events').EventEmitter;
const leiPromise = require('lei-promise');
const utils = require('./utils');
const debug = utils.debug('consumer');

class Consumer extends EventEmitter {

  /**
   * Constructor
   *
   * @param {Object} options
   *   - {String} queue
   *   - {Number} capacity
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
    this.name = utils.generateClientId('consumer');
    this._redisPrefix = (options.redis && options.redis.prefix) || '';
    this.queue = options.queue;
    this._queueKey = utils.getQueueKey(this._redisPrefix, options.queue);
    this._processingQueueKey = utils.getProcessingQueueKey(this._redisPrefix, options.queue, this.name);

    this.capacity = options.capacity || 0;

    this._isListening = false;
    this._processing = new Map();

  }

  /**
   * start listening
   *
   * @param {Function} msgHandler
   */
  listen(msgHandler) {

    if (this._isListening) {
      throw new Error('consumer is already listening, please don\'t call listen() method twice');
    } else {
      this._isListening = true;
    }

    const pull = () => {

      if (this.capacity > 0 && this._processing.size >= this.capacity) return;

      this._redis.brpoplpush(this._queueKey, this._processingQueueKey, 0, (err, ret) => {
        if (err) {
          this.emit('error', err);
        } else {

          // msg: producer,id,expire,data
          const info = utils.splitString(ret, 4);

          const expire = Number(info[2]);
          if (expire > utils.secondTimestamp()) {
            return reply(producerName, msgId, 'e', 'message expired', ret);
          }

          const producerName = info[0];
          const msgId = info[1];
          const data = info[3];

          const msg = new Message(producerName, msgId, expire, data, ret);
          msgHandler(msg);

          pull();

        }
      });

    };

    const reply = (producerName, msgId, type, data, originData) => {

      const callbackKey = utils.getCallbackKey(this._redisPrefix, producerName);
      // msg: success => id,s,data    error => id,e,data
      const callbackData = `${msgId},${type},${data}`;
      this._redis.publish(callbackKey, callbackData);

      this._redis.lrem(this._processingQueueKey, 0, originData);

      pull();

    };

    class Message {

      constructor(producerName, msgId, expire, data, originData) {
        this.producerName = producerName;
        this.msgId = msgId;
        this.expire = expire;
        this.data = data;
        this.originData = originData;
      }

      reject(err) {
        reply(this.producerName, this.msgId, 'e', (err && err.message) || err.toString(), this.originData);
      }

      resolve(data) {
        reply(this.producerName, this.msgId, 's', data, this.originData);
      }

    }

    pull();

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

module.exports = Consumer;
