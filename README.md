[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]
[![David deps][david-image]][david-url]
[![node version][node-image]][node-url]
[![npm download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/super-queue.svg?style=flat-square
[npm-url]: https://npmjs.org/package/super-queue
[travis-image]: https://img.shields.io/travis/SuperID/super-queue.svg?style=flat-square
[travis-url]: https://travis-ci.org/SuperID/super-queue
[coveralls-image]: https://img.shields.io/coveralls/SuperID/super-queue.svg?style=flat-square
[coveralls-url]: https://coveralls.io/r/SuperID/super-queue?branch=master
[david-image]: https://img.shields.io/david/SuperID/super-queue.svg?style=flat-square
[david-url]: https://david-dm.org/SuperID/super-queue
[node-image]: https://img.shields.io/badge/node.js-%3E=_4.0-green.svg?style=flat-square
[node-url]: http://nodejs.org/download/
[download-image]: https://img.shields.io/npm/dm/super-queue.svg?style=flat-square
[download-url]: https://npmjs.org/package/super-queue

# super-queue
基于Redis的简单消息队列模块

## 安装

```bash
$ npm install super-queue --save
```

**必须使用 Node.js v4.0 或更高版本**

## 使用

### 生产者 Producer

```javascript
import {Producer} from 'super-queue';

const p = new Producer({
  // 队列名称
  queue: 'my_queue',
  // 设置Redis数据库连接
  redis: {host: 'localhost', port: 6379, db: 0},
  // 默认的消息有效时间(s)，为0表示永久
  maxAge: 0,
  // 心跳时间周期（s），默认2秒
  heartbeat: 2,
});

// 消息入队
const data = 'abcdefg'; // 消息内容，必须为字符串类型
const maxAge = 10;      // 消息有效时间，当省略此参数时使用默认的maxAge值
p.push({data, maxAge}, (err, ret) => {
  if (err) {
    // 消息处理出错
    console.error(err);
  } else {
    // 消息的处理结果
    console.log(ret);
  }
});
// 可使用Promise方式
p.push({data, maxAge})
  .then(result => console.log(result))
  .catch(err => console.error(err));

// 初始化成功，触发start事件
// 注意：一定要在触发此事件后再使用push()，否则可能无法收到消息处理结果
p.on('start', () => {
  console.log('start working');
});

// 退出
p.exit();
```

### 消费者 Consumer

```javascript
import {Consumer} from 'super-queue';

const c = new Consumer({
  // 队列名称
  queue: 'my_queue',
  // 设置Redis数据库连接
  redis: {host: 'localhost', port: 6379, db: 0},
  // 处理能力，如果当前消费者正在处理的消息数量超过该值则不再接收新消息，为0表示不限制
  capacity: 0,
  // 心跳时间周期（s），默认2秒
  heartbeat: 2,
});

// 监听队列
c.listen(msg => {
  // msg.data = 消息内容
  // msg.expire = 消息过期秒时间戳
  // msg.reject(err) 消息处理出错
  // msg.resolve(result) 消息处理成功
  // msg.checkTimeout(callback) 检查执行是否超时，如果在expire之后的时间还没有响应，则自动响应一个MessageProcessingTimeoutError，并执行回调函数
});

// 退出
c.exit();
```

### 监视器 Monitor

监视器主要完成以下功能：

+ 当消费者异常退出时，自动将该消费者中未处理完的任务重新加入队列
+ 监控队列长度，当超过指定值时自动清理部分最早入队但未处理的消息，并通知相应的生产者

```javascript
import {Monitor} from 'super-queue';

const m = new Monitor({
  // 设置Redis数据库连接
  redis: {host: 'localhost', port: 6379, db: 0},
  // 自动检查时间间隔（s），默认为2秒
  interval: 2,
});

m.on('producerUp', info => {
  // info.queue 队列名称
  // info.name  生产者名称
});
m.on('producerDown', info => /* 同上 */);

m.on('consumerUp', info => {
  // info.queue 队列名称
  // info.name  消费者名称
});
m.on('consumerDown', info => /* 同上 */);

// 获取客户端状态
m.clientStatus((err, info) => {
  if (err) {
    console.error(err);
  } else {
    // info.producers   生产者列表，同producerUp的info
    // info.consumers   消费者列表，同consumerUp的info
  }
});

// 获取队列状态
m.queueStatus((err, list) => {
  if (err) {
    console.error(err);
  } else {
    // list 等待队列，包含信息：{name, length}
  }
});

// 退出
m.exit();
```

## License

```
The MIT License (MIT)

Copyright (c) 2016 SuperID | 免费极速身份验证服务

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
