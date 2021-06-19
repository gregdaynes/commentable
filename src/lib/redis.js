import Redis from "ioredis"
import config from "../../config.js"
import { stringifyNestedObjects } from "./utils.js"

let instances = {}

export default function createConnection({
  namespace = "api",
  db = 0,
  connection = config.REDIS_CONNECTION,
} = {}) {
  if (namespace && instances[namespace]) {
    return instances[namespace]
  }

  const redisClient = new Redis(`${connection}/${db}`)

  if (namespace) {
    instances[namespace] = redisClient
    return instances[namespace]
  }

  return redisClient
}

// Transform object sent to xadd into valid message
Redis.Command.setArgumentTransformer("xadd", function (args) {
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
Redis.Command.setReplyTransformer("xread", function (result) {
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
      } catch (err) {
        // ignore errors on purpose
      }

      obj[namesValues[n]] = value
    }

    newResult.push(obj)
  }

  return newResult
})
