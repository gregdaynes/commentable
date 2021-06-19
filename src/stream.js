import redis from "ioredis"
import { join } from "desm"
import Ajv from "ajv"
import addFormats from "ajv-formats"
import Config from "../config.js"

export const config = {
  host: Config.REDIS_HOST,
  port: Config.REDIS_PORT,
}

const ajv = new Ajv()
addFormats(ajv)

// Transform object sent to xadd into valid message
redis.Command.setArgumentTransformer("xadd", function (args) {
  if (args.length !== 3) return args

  let argArray = []

  argArray.push(args[0], args[1]) // Key Name & ID.

  // Transform object into array of field name then value.
  let fieldNameValuePairs = stringifyNestedObjects(args[2])

  for (let [key, value] of Object.entries(fieldNameValuePairs)) {
    argArray.push(key, value)
  }

  return argArray
})

// Transform array of key, values into an object when read with xread
redis.Command.setReplyTransformer("xread", function (result) {
  if (!Array.isArray(result)) return result

  let newResult = []

  for (let r of result[0][1]) {
    let obj = {
      id: r[0],
    }

    let namesValues = r[1]

    for (let n = 0; n < namesValues.length; n += 2) {
      let value = namesValues[n + 1]

      try {
        value = JSON.parse(value)
      } catch (err) {}

      obj[namesValues[n]] = value
    }

    newResult.push(obj)
  }

  return newResult
})

export function add(redisClient, schema = {}) {
  const validate = ajv.compile(schema)

  return function (event) {
    let valid = validate(event)
    if (!valid) throw new Error(JSON.stringify(validate.errors))

    let stream = event.stream
    let id = "*"

    return redisClient.pipeline().xadd(stream, id, event).exec()
  }
}

export function read(redisClient, schema) {
  return async function (stream, startingPoint) {
    let redisStream = await redisClient
      .pipeline()
      .xread("STREAMS", stream, startingPoint)
      .exec()

    return redisStream[0][1]
  }
}

export function stringifyNestedObjects(obj) {
  let nestedObjects = {}

  for (let [key, value] of Object.entries(obj)) {
    if (typeof value === "object" && value !== null) {
      nestedObjects[key] = JSON.stringify(value)
    }
  }

  return {
    ...obj,
    ...nestedObjects,
  }
}

// TODO we probably want to have a separate instance of
// the redis client here. This comes from the subscribe
export function saveProjection(redisClient, schema) {
  let validate
  if (schema) validate = ajv.compile(schema)

  return function (projection) {
    if (validate) {
      let valid = validate(projection)

      if (!valid) throw new Error(JSON.stringify(validate.errors))
    }

    return redisClient.set(projection.id, "abc") //JSON.stringify(projection))
  }
}

export function readProjection(redisClient) {
  return function (projectionId) {
    // TODO should it be projectionId? or aggregateId?
    return redisClient.pipeline().get(projectionId).exec()
  }
}

export async function subscribe(stream, callback) {
  let client = redis.createClient(config)
  let lastId = "$"

  // TODO What about a mechanism to pause the subscription
  // or even throttle the checks on a timer. Would need some
  // sort of resume normal operations as well.
  while (true) {
    let redisStream = await client.xread(
      "BLOCK",
      "5000",
      "COUNT",
      100,
      "STREAMS",
      stream,
      lastId
    )
    if (!redisStream) continue

    let results = redisStream
    if (!results.length) continue

    // TODO either get rid of this redis client,
    // or create a new one and send that along
    callback(results, client)
    lastId = results[results.length - 1].id
  }
}

// Use stream as a standalone application
// requires NodeJS to be executed using the flag
// `--experimental-import-meta-resolve`
// through the CLI, provide a stream name to listen for events as well
// as a module that exports a function to handle the events
// `node --experimental-import-meta-resolve src/stream.js topic handler.js
if (import.meta.resolve) {
  if ((await import.meta.resolve(process.argv[1])) === import.meta.url) {
    const { default: handler } = await import(
      join(import.meta.url, process.argv[3])
    )

    await subscribe(process.argv[2], handler)
  }
}
