import buildServer from "./index.js"
import config from "../config.js"
import { subscribe } from "./stream.js"
import handler from "./projection.js"
import redisClient from "./lib/redis.js"
import log from "./lib/log.js"

const fastify = await buildServer({
  ...config,
  redis: redisClient({ config }),
  logger: log({ config }),
})

try {
  await fastify.listen(config.HTTP_PORT, config.HTTP_HOST)

  if (config.SINGLE_PROCESS_MODE) {
    // Subscribe to streams and send to specific projection
    await subscribe({
      handler,
      stream: config.EVENT_STREAM,
      // Use a different redis connection, the subscribe is a blocking loop
      client: redisClient({ config, namespace: "subscription" }),
    })
  }
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
