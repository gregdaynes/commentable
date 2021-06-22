#!/bin/env/node

import buildServer from "../src/index.js"
import config from "../config.js"
import { listenForMessage } from "../src/lib/stream.js"
import projectionComment from "../src/lib/comment.js"
import redisClient from "../src/lib/redis.js"
import log from "../src/lib/log.js"

const client = redisClient({ config, namespace: "api" })

const fastify = await buildServer({
  ...config,
  redis: client,
  logger: log({ config }),
})

try {
  await fastify.listen(config.HTTP_PORT, config.HTTP_HOST)

  if (config.SINGLE_PROCESS_MODE) {
    await listenForMessage({
      stream: config.EVENT_STREAM,
      client: redisClient({ config, namespace: "subscription" }),
      lastId: 0,
      handler(events) {
        if (!events.length) return

        for (let event of events) {
          return projectionComment({ client: fastify.redis, event })
        }
      },
    })
  }
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
