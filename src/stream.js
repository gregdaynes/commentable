import redis from "ioredis"
import config from "../config.js"
import { join } from "desm"

const redisConfig = {
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
}

export default {
  config: redisConfig,
  subscribe,
}

async function subscribe(stream, callback) {
  let client = redis.createClient(redisConfig)
  let lastId = "$"

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
