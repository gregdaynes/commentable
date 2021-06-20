#!/bin/env/node

import buildServer from "../src/index.js"
import config from "../config.js"
import { listenForMessage } from "../src/stream.js"
import projection from "../src//projection.js"
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
    // Subscribe to streams and send to specific projection
    await listenForMessage({
      handler: projection(client),
      stream: config.EVENT_STREAM,
      // Use a different redis connection, the subscribe is a blocking loop
      client: redisClient({ config, namespace: "subscription" }),
    })
  }
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
