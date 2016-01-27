'use strict';

/**
 * super-queue utils
 *
 * @authro Zongmin Lei <leizongmin@gmail.com>
 */

const createDebug = require('debug');
const Redis = require('ioredis');
const leiPromise = require('lei-promise');
const utils = exports = module.exports = require('lei-utils').extend();

/**
 * Create Debug Function
 *
 * @param {String} name
 * @return {Function}
 */
utils.debug = function (name) {
  return createDebug('super-queue:' + name);
};

/**
 * Generate Redis Client
 *
 * @param {Object} options
 * @return {Object}
 */
utils.createRedisClient = function (options) {
  return new Redis(options);
};

/**
 * Generate Client ID
 *
 * @param {String} type should be one of "producer", "consumer", "monitor"
 * @return {String}
 */
utils.generateClientId = function (type) {
  return type.slice(0, 1).toUpperCase() + (utils.md5(Date.now() + '' + Math.random()).slice(0, 9));
};

/**
 * Get Second Timestamp
 *
 * @return {Number}
 */
utils.secondTimestamp = function () {
  return (Date.now() / 1000) << 0;
};

/**
 * Integer Value to Base64 String
 *
 * @param {Number} value
 * @return {String}
 */
utils.integerToShortString = function (value) {
  return Number(value).toString(36);
};

/**
 * Split String by Separator
 *
 * @param {String} text
 * @param {String} separator
 * @param {Number} length
 * @return {Array}
 */
utils.splitString = function (text, separator, length) {
  const list = [];
  let lastIndex = 0;
  for (let i = 0; i < length - 1; i++) {
    let j = text.indexOf(separator, lastIndex);
    if (j === -1) {
      break;
    } else {
      list.push(text.slice(lastIndex, j));
      lastIndex = j + 1;
    }
  }
  list.push(text.slice(lastIndex, text.length));
  return list;
};

utils.getQueueKey = function (prefix, queue) {
  return prefix + 'Q:' + queue;
};

utils.getProcessingQueueKey = function (prefix, queue, name) {
  return prefix + 'PQ:' + queue + (name ? ':' + name : '');
};

utils.getCallbackKey = function (prefix, queue, name) {
  return prefix + 'CB:' + queue + (name ? ':' + name : '');
};

utils.getHeartbeatKey = function (prefix, type, queue, name) {
  return prefix + 'H:' + type.slice(0, 1).toUpperCase() + (queue ? ':' + queue : '') + (name ? ':' + name : '');
};

function MessageExpiredError(message) {
  Error.captureStackTrace(this, MessageExpiredError);
  this.name = 'MessageExpiredError';
  this.message = (message || '');
  this.code = 'msg_expired';
}
MessageExpiredError.prototype = Error.prototype;
utils.MessageExpiredError = MessageExpiredError;

function MessageProcessingTimeoutError(message) {
  Error.captureStackTrace(this, MessageProcessingTimeoutError);
  this.name = 'MessageProcessingTimeoutError';
  this.message = (message || '');
  this.code = 'msg_timeout';
}
MessageProcessingTimeoutError.prototype = Error.prototype;
utils.MessageProcessingTimeoutError = MessageProcessingTimeoutError;

utils.classMethodWrapPromise = function (obj, methods) {
  for (const method of methods) {
    obj.prototype['_' + method + 'Callback'] = obj.prototype[method];
    obj.prototype[method] = leiPromise.promisify(obj.prototype[method], null, true);
  }
};

utils.checkQueueName = function (name) {
  if (name.indexOf(':') !== -1) throw new Error(`invalid queue name "${name}", cannot contains colon ":"`);
};
