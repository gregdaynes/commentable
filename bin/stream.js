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

const client = redisClient({ config, namespace: "subscription" })
const handlerClient = redisClient({ config, namespace: "handler" })

log({ config }).info(`Subscribing to %s`, [process.argv[2]])
await listenForMessage({
  stream: process.argv[2],
  client,
  handler: handler(handlerClient),
})
