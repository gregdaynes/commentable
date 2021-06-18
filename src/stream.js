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

    let fieldNamesValues = r[1]

    for (let n = 0; n < fieldNamesValues.length; n += 2) {
      let k = fieldNamesValues[n]
      let v = JSON.parse(fieldNamesValues[n + 1])

      obj[k] = v
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

    let results = redisStream[0][1]
    if (!results.length) continue

    callback(results)
    lastId = results[results.length - 1][0]
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
