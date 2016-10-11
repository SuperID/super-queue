'use strict';

/**
 * super-queue Producer
 *
 * @authro Zongmin Lei <leizongmin@gmail.com>
 */

const EventEmitter = require('events').EventEmitter;
const utils = require('./utils');
const Timer = require('./timer');

class Producer extends EventEmitter {

  /**
   * Constructor
   *
   * @param {Object} options
   *   - {Number} heartbeat
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

    // 检查参数
    options = Object.assign({}, options || {});
    if (!options.queue) throw new Error('missing queue name');
    utils.checkQueueName(options.queue);

    // 初始化Redis相关状态
    this._redis = utils.createRedisClient(options.redis);
    this._redisSub = utils.createRedisClient(options.redis);
    this.name = utils.generateClientId('producer');
    this._redisPrefix = (options.redis && options.redis.prefix) || '';
    this.queue = options.queue;
    this._queueKey = utils.getQueueKey(this._redisPrefix, options.queue);

    this._maxAge = options.maxAge || 0;

    this._msgId = 0;
    this._msgCallback = new EventEmitter();
    const msgCallback = (id, err, result) => {
      // this._debug('callback: id=%s, err=%s, result=%j', id, err, result);
      this._msgCallback.emit(id, err, result);
    };

    // 接收消息处理结果
    const callbackKey = utils.getCallbackKey(this._redisPrefix, this.queue, this.name);
    this._emitedStart = false;
    this._redisSub.subscribe(callbackKey, (channel, count) => {
      this._debug('on subscribe: callbackKey=%s, channel=%s, count=%s', callbackKey, channel, count);
      this._emitedStart = true;
      this.emit('start');
    });
    this._redisSub.on('message', (channel, message) => {
      this._debug('on reply: %s -> %s', channel, message);

      // msg: success => id,s,data    error => id,e,data
      const info = utils.splitString(message, ',', 3);
      if (info.length !== 3) return this._debug('invalid msg length: [%s] %j', info.length, info);

      const id = info[0];
      const type = info[1];
      const data = info[2];

      if (type === 's') {
        this._msgCounterSuccess += 1;
        msgCallback(id, null, { result: data });
      } else if (type === 'e') {
        this._msgCounterError += 1;
        const err = info[2];
        msgCallback(id, new Error(err));
      } else if (type === 'o') {
        this._msgCounterExpired += 1;
        const err = info[2];
        msgCallback(id, new utils.MessageExpiredError(err));
      } else {
        return this._debug('invalid msg type: [%s] %j', type, info);
      }
    });

    this._startedAt = utils.secondTimestamp();
    this._msgCounterTotal = 0;
    this._msgCounterSuccess = 0;
    this._msgCounterError = 0;
    this._msgCounterExpired = 0;

    this._exited = false;

    // 心跳
    this._heartbeat = options.heartbeat || 2;
    const heartbeat = () => {

      if (this._exited) return;

      const key = utils.getHeartbeatKey(this._redisPrefix, 'producer', this.queue, this.name);
      // msg: startedAt,msgTotal,msgSuccess,msgError,msgExpired
      const info = `${ this._startedAt },${ this._msgCounterTotal },${ this._msgCounterSuccess },${ this._msgCounterError },${ this._msgCounterExpired }`;
      this._redis.setex(key, this._heartbeat + 1, info);
      this._debug('heartbeat: %s <- %s', key, info);

    };
    this._heartbeatTid = setInterval(heartbeat, this._heartbeat * 1000);

    this._timer = new Timer(1000);

    this._debug = utils.debug('producer:' + this.name);
    this._debug('created: queue=%s, maxAge=%s, redis=%j', this.queue, this._maxAge, options.redis);

    // this.push = leiPromise.promisify(this.push.bind(this));
    // this.exit = leiPromise.promisify(this.exit.bind(this));

    heartbeat();
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

    if (!this._emitedStart) {
      return callback(new Error('please call push() method after `start` event'));
    }

    info.maxAge = ('maxAge' in info ? info.maxAge : this._maxAge);
    const expire = (info.maxAge > 0 ? utils.secondTimestamp() + info.maxAge : 0);

    this._msgId += 1;
    const id = utils.integerToShortString(this._msgId, 4);
    // msg: producer,id,expire,data
    const content = `${ this.name },${ id },${ expire },${ info.data }`;
    this._debug('new msg: %s <- %s', this._queueKey, content);

    this._msgCallback.once(id, callback);
    this._msgCounterTotal += 1;
    this._redis.lpush(this._queueKey, content, err => {
      if (err) return this._msgCallback.emit(id, err);
    });

    // 如果服务端超时不响应，则需要触发MessageProcessingTimeoutError
    // 为了避免冲突，加1秒以便不会先于Consumer或Monitor检查程序的触发
    // this._timer.add(expire + 1, () => {
    //   this._msgCallback.emit(id, new utils.MessageProcessingTimeoutError());
    // });
  }

  /**
   * exit
   *
   * @param {Function} callback
   */
  exit(callback) {
    this._exited = true;
    clearInterval(this._heartbeatTid);
    this._redis.end();
    this._redisSub.end();
    this._msgCallback = null;
    this._timer.destroy();
    callback && callback(null);
  }

}

module.exports = Producer;
