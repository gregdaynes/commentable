import { join } from "desm"
import Redis from "./lib/redis.js"
import validation from "./lib/validation.js"
import config from "../config.js"

export function add(schema) {
  let validate = schema ? validation.compile(schema) : undefined

  return async function (event) {
    if (validate) {
      let valid = validate(event)
      if (!valid) throw new Error(JSON.stringify(validate.errors))
    }

    return await Redis().pipeline().xadd(event.stream, "*", event).exec()
  }
}

export async function read() {
  async function read(stream, startingPoint = 0) {
    let redisStream = await Redis()
      .pipeline()
      .xread("STREAMS", stream, startingPoint)
      .exec()

    return redisStream[0][1]
  }

  // allow direct calling
  if (arguments) return read(arguments)

  // enable similar interface to set even though a config is not used
  return read
}

export async function subscribe({ handler = () => {}, stream, client } = {}) {
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

    handler(results)
    lastId = results[results.length - 1].id
  }
}

// Use stream as a standalone application
// requires NodeJS to be executed using the flag
// `--experimental-import-meta-resolve`
// through the CLI, provide a stream name to listen for events as well
// as a module that exports a function to handle the events
// `node --experimental-import-meta-resolve src/stream.js topic handler.js
// if (import.meta.resolve) {
//   if ((await import.meta.resolve(process.argv[1])) === import.meta.url) {
//     const { default: handler } = await import(
//       join(import.meta.url, process.argv[3])
//     )
//
//     await subscribe(process.argv[2], handler)
//   }
// }
