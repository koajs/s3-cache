'use strict'

const request = require('supertest')
const assert = require('assert')
const koa = require('koa')
const fs = require('fs')

const cache = require('..')({
  key: process.env.KOA_S3_CACHE_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
  secret: process.env.KOA_S3_CACHE_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY,
  bucket: process.env.KOA_S3_CACHE_BUCKET,
  salt: random(),
})

describe('string', function () {
  const app = koa()
  const path = '/' + random()
  const text = 'kljasldkfjlaksdjflkajsdf'

  app.use(function* () {
    if (yield* cache.get(this)) return

    this.body = text

    yield* cache.put(this)
  })

  const server = app.listen()

  let etag

  it('should cache and serve the response', function (done) {
    request(server)
    .get(path)
    .expect('Content-Type', /text\/plain/)
    .expect(200)
    .expect(text, function (err, res) {
      if (err) return done(err)

      assert(etag = res.headers.etag)
      done()
    })
  })

  it('should serve the cached response', function (done) {
    request(server)
    .get(path)
    .expect('Content-Type', /text\/plain/)
    .expect('ETag', etag)
    .expect(200)
    .expect(text, function (err, res) {
      if (err) return done(err)

      assert(etag = res.headers.etag)
      done()
    })
  })

  it('should support caching', function (done) {
    request(server)
    .get(path)
    .set('if-none-match', etag)
    .expect(304, done)
  })
})

describe('stream', function () {
  const app = koa()
  const path = '/' + random()

  app.use(function* () {
    if (yield* cache.get(this)) return

    this.type = 'text'
    this.body = fs.createReadStream(__filename)

    yield* cache.put(this)
  })

  const server = app.listen()

  let etag

  it('should cache and serve the response', function (done) {
    request(server)
    .get(path)
    .expect('Content-Type', /text\/plain/)
    .expect(200, function (err, res) {
      if (err) return done(err)

      assert(etag = res.headers.etag)
      assert(/laksjdflkajsldkfjalksdf/.test(res.text))
      done()
    })
  })

  it('should serve the cached response', function (done) {
    request(server)
    .get(path)
    .expect('Content-Type', /text\/plain/)
    .expect('ETag', etag)
    .expect(200, function (err, res) {
      if (err) return done(err)

      assert(etag = res.headers.etag)
      assert(/klajsdfljasdfasdf/.test(res.text))
      done()
    })
  })
})

describe('404', function () {
  const app = koa()
  const path = '/' + random()

  app.use(function* () {
    if (yield* cache.get(this)) return

    yield* cache.put(this)
  })

  const server = app.listen()

  it('should not cache 404s', function (done) {
    request(server)
    .get('/')
    .expect(404)
    .expect('Not Found', function (err, res) {
      if (err) return done(err)

      assert(!res.headers.tag)
      done()
    })
  })
})

describe('no content', function () {
  const app = koa()
  const path = '/' + random()

  app.use(function* () {
    if (yield* cache.get(this)) return

    this.body = ''

    yield* cache.put(this)
  })

  const server = app.listen()

  it('should not cache empty bodies', function (done) {
    request(server)
    .get('/')
    .expect(200)
    .expect('', function (err, res) {
      if (err) return done(err)

      assert(!res.headers.tag)
      done()
    })
  })
})

describe('middleware', function () {
  const app = koa()
  const path = '/' + random()
  const body = random()

  app.use(cache)

  app.use(function* () {
    this.body = body
  })

  const server = app.listen()

  it('should work as middleware', function (done) {
    request(server)
    .get(path)
    .expect(body)
    .expect(200, done)
  })
})

describe('.wrap()', function () {
  const app = koa()
  const path = '/' + random()
  const body = random()

  app.use(cache.wrap(function* () {
    this.body = body
  }))

  const server = app.listen()

  it('should wrap middleware', function (done) {
    request(server)
    .get(path)
    .expect(body)
    .expect(200, done)
  })
})

function random() {
  return Math.random().toString(36)
}
