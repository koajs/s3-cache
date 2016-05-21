'use strict'

const s3ProxyStream = require('s3-proxy-stream')
const Promise = require('any-promise')
const crypto = require('crypto')
const AWS = require('aws-sdk')

const HEADER_TO_PARAM_MAP = {
  'Cache-Control': 'CacheControl',
  'Content-Disposition': 'ContentDisposition',
  'Content-Encoding': 'ContentEncoding',
  'Content-Language': 'ContentLanguage',
  'Content-Type': 'ContentType',
}

module.exports = Cache

function Cache (options) {
  if (!(this instanceof Cache)) return new Cache(options)

  if (options.key) options.accessKeyId = options.key
  if (options.secret) options.secretAccessKey = options.secret

  this.s3 = options.s3 || new AWS.S3(options)
  this.proxy = s3ProxyStream(this.s3, options)

  this.bucket = options.bucket || options.Bucket

  // salt for hashing
  this.salt = options.salt || ''
}

// pretend it's a generator function so app.use() works
// TODO: remove when we add async/await support
Cache.prototype.constructor = function * () {}.constructor
Cache.prototype.call = function * (ctx, next) {
  if (yield this.get(ctx)) return

  yield next

  yield this.put(ctx)
}

Cache.prototype.wrap = function (fn) {
  const self = this
  return function * (next) {
    if (yield self.get(this)) return

    yield fn.call(this, next)

    yield self.put(this)
  }
}

Cache.prototype.get = function * (ctx) {
  const key = this._key(ctx)
  console.log(key)
  const res = yield this.proxy(key, {
    headers: ctx.request.headers,
  })

  console.log(res)

  if (res.statusCode !== 200) {
    res.resume()
    return false
  }

  ctx.body = res

  for (const key of res.headers) {
    ctx.response.set(key, res.headers[key])
  }

  if (ctx.fresh) ctx.status = 304

  return true
}

Cache.prototype.set =
Cache.prototype.put = function * (ctx) {
  switch (ctx.status) {
    case 200:
    case 201:
    case 202:
      break
    default:
      return
  }

  console.log('what')

  const response = ctx.response
  const body = response.body
  if (body == null) return

  const params = {
    Bucket: this.bucket,
    StorageClass: 'REDUCED_REDUNDANCY',
    Body: body,
  }

  console.log(params)

  for (const header of Object.keys(HEADER_TO_PARAM_MAP)) {
    if (response.get(header)) params[HEADER_TO_PARAM_MAP[header]] = response.get(header)
  }

  const key = this._key(ctx)

  const data = yield new Promise((resolve, reject) => {
    console.log('put object')
    this.s3.putObject({
      Key: key
    }, (err, data) => {
      console.log('putting object')
      if (err) return reject(err)
      resolve(data)
    })
  })

  // use s3's headers
  response.etag = data.ETag

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
