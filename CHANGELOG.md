<a name="0.0.5"></a>
## [0.0.5](https://github.com/SuperID/super-queue/compare/v0.0.3...v0.0.5) (2016-06-07)




<a name="0.0.3"></a>
## [0.0.3](https://github.com/SuperID/super-queue/compare/v0.0.2...v0.0.3) (2016-01-27)


### Bug Fixes

* **Consumer:** 使用自己编写的Timer代替setTimeout ([3dc31f4](https://github.com/SuperID/super-queue/commit/3dc31f4))

### Features

* **Consumer:** add method `msg.checkTimeout(callback)` ([c74cab6](https://github.com/SuperID/super-queue/commit/c74cab6))



<a name="0.0.2"></a>
## [0.0.2](https://github.com/SuperID/super-queue/compare/1d39610...v0.0.2) (2016-01-25)


### Bug Fixes

* **consumer:** lrem -1 ([1aded12](https://github.com/SuperID/super-queue/commit/1aded12))
* **consumer:** 消息超时时程序崩溃问题 ([d5d96fd](https://github.com/SuperID/super-queue/commit/d5d96fd))
* 初始化实例时检查options ([4636abd](https://github.com/SuperID/super-queue/commit/4636abd))

### Features

* **Monitor:** 当consumer下线时，自动将其未完成的消息转移回主队列 ([f183ccd](https://github.com/SuperID/super-queue/commit/f183ccd))
* **producer:** class Producer init ([1d39610](https://github.com/SuperID/super-queue/commit/1d39610))
* 异步方法支持Promise ([37d9fd1](https://github.com/SuperID/super-queue/commit/37d9fd1))
* **producer:** push()方法必须在start事件触发后才能调用，否则报错 ([1515bae](https://github.com/SuperID/super-queue/commit/1515bae))



