
# s3-cache

[![NPM version][npm-image]][npm-url]
[![Build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]
[![Dependency Status][david-image]][david-url]
[![License][license-image]][license-url]
[![Downloads][downloads-image]][downloads-url]

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

## API

### const cache = Cache(options)

Create a `cache` instance.

S3 options:

- `key`
- `secret`
- `bucket`

Other options:

- `salt` - add a salt to namespace your `cache` instances

### app.use(cache)

You can use the cache as middleware,
which caches all downstream middleware.

```js
app.use(cache)

app.use(function* () {
  this.body = 'something computationally intensive'
})
```

### app.use(cache.wrap( next => ))

Wrap a middleware with the cache.
Useful for conditional caching

```js
app.use(cache.wrap(function* () {
  this.body = 'something computationally intensive'
}))
```

### const served = yield cache.get(this)

Serve this request from the cache.
Returns `served`, which is whether the response has been served from the cache.

### yield cache.put(this)

Caches the current response.

## Notes

- You should set an object lifecycle rule.
  Ex. delete all files in the bucket after 7 days.
- Objects are stored with `REDUCED_REDUNDANCY`.
- Only supports `200-2` status codes.
- If the body is streaming, the stream is cached to the filesystem so that the S3 client knows its `content-length`.

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
