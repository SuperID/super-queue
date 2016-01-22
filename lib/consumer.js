'use strict';

/**
 * super-queue Consumer
 *
 * @authro Zongmin Lei <leizongmin@gmail.com>
 */

const EventEmitter = require('events').EventEmitter;
const utils = require('./utils');

class Consumer extends EventEmitter {

  /**
   * Constructor
   *
   * @param {Object} options
   *   - {Number} heartbeat
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

    this._redisPull = utils.createRedisClient(options.redis);
    this._redis = utils.createRedisClient(options.redis);
    this.name = utils.generateClientId('consumer');
    this._redisPrefix = (options.redis && options.redis.prefix) || '';
    this.queue = options.queue;
    this._queueKey = utils.getQueueKey(this._redisPrefix, options.queue);
    this._processingQueueKey = utils.getProcessingQueueKey(this._redisPrefix, options.queue, this.name);

    this.capacity = options.capacity || 0;

    this._isListening = false;
    this._processing = new Map();

    this._startedAt = utils.secondTimestamp();
    this._msgCounterTotal = 0;
    this._msgCounterSuccess = 0;
    this._msgCounterError = 0;
    this._msgCounterExpired = 0;

    this._heartbeat = options.heartbeat || 2;
    const heartbeat = () => {

      const key = utils.getHeartbeatKey(this._redisPrefix, 'consumer', this.queue, this.name);
      // msg: startedAt,msgTotal,msgSuccess,msgError,msgExpired,capacity,processingCount
      const info = `${this._startedAt},${this._msgCounterTotal},${this._msgCounterSuccess},${this._msgCounterError},${this._msgCounterExpired},${this.capacity},${this._processing.size}`;
      this._redis.setex(key, this._heartbeat + 1, info);
      this._debug('heartbeat: %s <- %s', key, info);

    };
    this._heartbeatTid = setInterval(heartbeat, this._heartbeat * 1000);

    this._debug = utils.debug('consumer:' + this.name);
    this._debug('created: queue=%s, capacity=%s, redis=%j', this.queue, this.capacity, options.redis);

    heartbeat();

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

      this._debug('pulling: capacity=%s, processing=%s', this.capacity, this._processing.size);
      this._redisPull.brpoplpush(this._queueKey, this._processingQueueKey, 0, (err, ret) => {
        this._debug('new msg: err=%s, content=%s', err, ret);
        if (err) {
          this.emit('error', err);
        } else if (!ret) {
          return pull();
        } else {

          // msg: producer,id,expire,data
          const info = utils.splitString(ret, ',', 4);

          const expire = Number(info[2]);
          const producerName = info[0];
          const msgId = info[1];
          const data = info[3];

          this._msgCounterTotal++;

          if (expire > 0 && expire < utils.secondTimestamp()) {
            return reply(producerName, msgId, 'o', 'expired', ret);
          }

          const msg = new Message(producerName, msgId, expire, data, ret);
          this._processing.set(producerName + ':' + msgId, true);
          msgHandler(msg);

          pull();

        }
      });

    };

    const reply = (producerName, msgId, type, data, originData) => {

      if (type === 'e') {
        this._msgCounterError++;
      } else if (type === 'o') {
        this._msgCounterExpired++;
      } else {
        this._msgCounterSuccess++;
      }

      const callbackKey = utils.getCallbackKey(this._redisPrefix, this.queue, producerName);
      // msg: success => id,s,data    error => id,e,data
      const callbackData = `${msgId},${type},${data}`;
      this._redis.publish(callbackKey, callbackData);
      this._debug('reply: %s <- %s', callbackKey, callbackData);

      this._redis.lrem(this._processingQueueKey, -1, originData);
      this._debug('delete msg: %s :: %s', this._processingQueueKey, originData);

      this._processing.delete(producerName + ':' + msgId);
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
    this._redisPull.end();
    this._redis.end();
    clearInterval(this._heartbeatTid);
    callback && callback(null);
  }

}

utils.classMethodWrapPromise(Consumer, ['exit']);

module.exports = Consumer;
