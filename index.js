'use strict'

const onFinished = require('on-finished')
const temp = require('temp-path')
const crypto = require('crypto')
const knox = require('knox')
const cp = require('fs-cp')
const fs = require('fs')

module.exports = Cache

function Cache(options) {
  if (!(this instanceof Cache)) return new Cache(options)

  this.client = knox.createClient(options)

  // salt for hashing
  this.salt = options.salt || ''
}

// pretend it's a generator function so app.use() works
// TODO: remove when we add async/await support
Cache.prototype.constructor = function* () {}.constructor
Cache.prototype.call = function* (ctx, next) {
  if (yield* this.get(ctx)) return

  yield* next

  yield* this.put(ctx)
}

Cache.prototype.wrap = function (fn) {
  const self = this
  return function* (next) {
    if (yield* self.get(this)) return

    yield* fn.call(this, next)

    yield* self.put(this)
  }
}

Cache.prototype.get = function* (ctx) {
  const self = this
  const key = this._key(ctx)
  const res = yield new Promise(function (resolve, reject) {
    self.client.getFile(key, function (err, res) {
      /* istanbul ignore if */
      if (err) return reject(err)
      resolve(res)
    })
  })

  if (res.statusCode !== 200) {
    res.resume()
    return false
  }

  ctx.body = res

  let keys = [
    'cache-control',
    'content-disposition',
    'content-encoding',
    'content-language',
    'content-length',
    'content-type',
    'etag',
  ]
  for (let key of keys)
    if (res.headers[key])
      ctx.response.set(key, res.headers[key])

  if (ctx.fresh) ctx.status = 304

  return true
}

Cache.prototype.set =
Cache.prototype.put = function* (ctx) {
  switch (ctx.status) {
    case 200:
    case 201:
    case 202:
      break
    default:
      return
  }

  const client = this.client
  const response = ctx.response
  const res = ctx.res
  let body = response.body
  if (!body) return

  // if a stream, we save it to a file and serve from that
  // because amazon needs to know the content length prior -_-
  let filename
  if (typeof body.pipe === 'function') {
    yield cp(body, filename = temp())
    body = null

    // re-serve the same response
    response.body = fs.createReadStream(filename)
    // always delete the file afterwards
    onFinished(res, function () {
      setImmediate(function () {
        fs.unlink(filename, noop)
      })
    })
  }

  const headers = {
    'x-amz-storage-class': 'REDUCED_REDUNDANCY',
  }

  // note: capitalization required for Knox
  let keys = [
    'Cache-Control',
    'Content-Disposition',
    'Content-Encoding',
    'Content-Language',
    'Content-Type',
  ]
  for (let key of keys)
    if (response.get(key))
      headers[key] = response.get(key)

  let key = this._key(ctx)

  let s3response = yield new Promise(function (resolve, reject) {
    if (filename) {
      client.putFile(filename, key, headers, callback)
    } else {
      client.putBuffer(body, key, headers, callback)
    }

    function callback(err, res) {
      // istanbul ignore if */
      if (err) return reject(err)
      resolve(res)

      // TODO: real error handling
      // istanbul ignore if */
      if (res.statusCode !== 200) {
        res.setEncoding('utf8')
        res.on('data', function (chunk) {
          console.log(chunk)
        })
      }
    }
  })

  // dump the response because we don't care
  s3response.resume()
  ctx.assert(s3response.statusCode === 200, 'Did not get a 200 from uploading the file.')

  // use s3's headers
  response.etag = s3response.headers.etag

  if (ctx.fresh) ctx.status = 304
}

// hash the path so that it's always a simple string for s3
// and to make it more cacheable by making the first few chars random
Cache.prototype._key = function (ctx) {
  return crypto.createHash('sha256')
    .update(this.salt)
    .update('url:')
    .update(ctx.request.url)
    .digest('hex')
}

function noop() {}
