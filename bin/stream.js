#!/bin/env/node

import { join } from "desm"
import config from "../config.js"
import log from "../src/lib/log.js"
import redisClient from "../src/lib/redis.js"
import { listenForMessage, add } from "../src/lib/stream.js"

let handler
if (process.argv[3]) {
  const { default: handle } = await import(
    join(import.meta.url, process.argv[3])
  )

  handler = handle
}

log({ config }).info(`Subscribing to %s`, [process.argv[2]])
await listenForMessage({
  handler,
  stream: process.argv[2],
  client: redisClient({ config, namespace: "subscription" }),
  handlerClient: redisClient({ config, namespace: "handler" }),
})
