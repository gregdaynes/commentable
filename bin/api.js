#!/bin/env/node

import buildServer from "../src/index.js"
import config from "../config.js"
import { listenForMessage } from "../src/lib/stream.js"
import projectionComment from "../src/lib/comment.js"
import redisClient from "../src/lib/redis.js"
import Log from "../src/lib/log.js"

const log = Log({ config })
const client = redisClient({ config, namespace: "api" })

const fastify = await buildServer({
  ...config,
  redis: client,
  logger: log,
})

try {
  await fastify.listen(config.HTTP_PORT, config.HTTP_HOST)

  if (config.SINGLE_PROCESS_MODE) {
    fastify.log.info("Watching %s for events", [config.EVENT_STREAM])

    await listenForMessage({
      stream: config.EVENT_STREAM,
      client: redisClient({ config, namespace: "subscription" }),
      lastId: 0,
      async handler(events) {
        fastify.log.info("Processing %s events", [events?.length])
        if (!events?.length) return

        for (let event of events) {
          await projectionComment({ client: fastify.redis, event })
        }

        return
      },
    })
  }
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
