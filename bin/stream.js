#!/bin/env/node

import config from "../config.js"
import { join } from "desm"
import log from "../src/lib/log.js"
import redisClient from "../src/lib/redis.js"
// TODO this should move to lib
import { listenForMessage, add } from "../src/stream.js"

if (process.argv[3]) {
  const { default: handler } = await import(
    join(import.meta.url, process.argv[3])
  )
}

const client = redisClient({ config, namespace: "subscription" })
const handlerClient = redisClient({ config, namespace: "handler" })

log({ config }).info(`Subscribing to %s`, [process.argv[2]])
await listenForMessage({
  stream: process.argv[2],
  client,
  handler: (...args) => console.log(args),
})
