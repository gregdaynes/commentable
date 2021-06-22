#!/bin/env/node

import { join } from "desm"
import config from "../config.js"
import redisClient from "../src/lib/redis.js"
import { listenForMessage, add } from "../src/lib/stream.js"
import projectionComment from "../src/lib/comment.js"
import Log from "../src/lib/log.js"

const log = Log({ namespace: "stream", config })
const handlerClient = redisClient({ config })

async function handler(events) {
  log.info("Processing %s events", [events?.length])
  if (!events.length) return

  for (let event of events) {
    await projectionComment({ client: handlerClient, event })
  }

  return
}

log.info(`Subscribing to %s`, [config.EVENT_STREAM])
await listenForMessage({
  handler,
  stream: config.EVENT_STREAM,
  client: redisClient({ config, namespace: "subscription" }),
  lastId: 0,
})
