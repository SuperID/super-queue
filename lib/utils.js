'use strict';

/**
 * super-queue utils
 *
 * @authro Zongmin Lei <leizongmin@gmail.com>
 */

const createDebug = require('debug');
const Redis = require('ioredis');
const utils = exports = module.exports = require('lei-utils').extend();

// if set environment variable NODE_TEST includes "super-queue" then IS_TEST=true
const IS_TEST = (String(process.env.NODE_TEST).indexOf('super-queue') !== -1);


/**
 * Create Debug Function
 *
 * @param {String} name
 * @return {Function}
 */
utils.debug = function (name) {
  return 'super-queue:' + name;
};

/**
 * Generate Redis Client
 *
 * @param {Object} options
 * @return {Object}
 */
utils.createRedisClient = function (options) {
  if (IS_TEST) {
    return require('fakeredis').createClient();
  } else {
    return new Redis(options);
  }
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
 * @param {Number} byteLength
 * @return {String}
 */
utils.integerToBase64 = function (value, byteLength) {
  const buf = new Buffer(byteLength);
  buf.writeIntLE(value, 0, byteLength);
  return buf.toString('base64');
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
