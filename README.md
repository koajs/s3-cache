
# s3-cache

[![NPM version][npm-image]][npm-url]
[![Build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]
[![Dependency Status][david-image]][david-url]
[![License][license-image]][license-url]
[![Downloads][downloads-image]][downloads-url]
[![Gittip][gittip-image]][gittip-url]

Caches and serves responses to and from S3.
Similar to [koa-cash](https://github.com/koajs/cash),
except it optimizes for the S3 use-case by streaming.

Usage:

```js
let cache = require('koa-s3-cache')({
  // s3 credentials and stuff
})

app.use(function* (next) {
  // served from cache
  if (yield* cache.get(this)) return

  // do some crazy computation
  this.body = new Buffer(1024 * 1024)

  // save it to s3
  yield* cache.put(this)
})
```

This is best for dynamically created content that is cached (i.e. thumbnails).
Instead of caching yourself in the business logic,
cache transparently with this module.

## Notes

- You should set an object lifecycle rule.
  Ex. delete all files in the bucket after 7 days.
- Objects are stored with `REDUCED_REDUNDANCY`.

[npm-image]: https://img.shields.io/npm/v/koa-s3-cache.svg?style=flat-square
[npm-url]: https://npmjs.org/package/koa-s3-cache
[github-tag]: http://img.shields.io/github/tag/koajs/s3-cache.svg?style=flat-square
[github-url]: https://github.com/koajs/s3-cache/tags
[travis-image]: https://img.shields.io/travis/koajs/s3-cache.svg?style=flat-square
[travis-url]: https://travis-ci.org/koajs/s3-cache
[coveralls-image]: https://img.shields.io/coveralls/koajs/s3-cache.svg?style=flat-square
[coveralls-url]: https://coveralls.io/r/koajs/s3-cache
[david-image]: http://img.shields.io/david/koajs/s3-cache.svg?style=flat-square
[david-url]: https://david-dm.org/koajs/s3-cache
[license-image]: http://img.shields.io/npm/l/koa-s3-cache.svg?style=flat-square
[license-url]: LICENSE
[downloads-image]: http://img.shields.io/npm/dm/koa-s3-cache.svg?style=flat-square
[downloads-url]: https://npmjs.org/package/koa-s3-cache
[gittip-image]: https://img.shields.io/gratipay/jonathanong.svg?style=flat-square
[gittip-url]: https://gratipay.com/jonathanong/
