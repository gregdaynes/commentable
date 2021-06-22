#!/bin/env/node

import { join } from "desm"
import config from "../config.js"
import log from "../src/lib/log.js"
import redisClient from "../src/lib/redis.js"
import { listenForMessage, add } from "../src/lib/stream.js"
import projectionComment from "../src/lib/comment.js"

const handlerClient = redisClient({ config })

function handler(events) {
  if (!events.length) return

  for (let event of events) {
    return projectionComment({ client: handlerClient, event })
  }
}

log({ config }).info(`Subscribing to %s`, [config.EVENT_STREAM])
await listenForMessage({
  handler,
  stream: config.EVENT_STREAM,
  client: redisClient({ config, namespace: "subscription" }),
  lastId: 0,
})
