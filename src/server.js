import buildServer from "./index.js"
import config from "../config.js"
import { subscribe } from "./stream.js"
import handler from "./projection.js"

const fastify = await buildServer(config)

try {
  await fastify.listen(config.HTTP_PORT, config.HTTP_HOST)

  if (config.SINGLE_PROCESS_MODE) {
    // Subscribe to streams and send to specific projection
    await subscribe({ handler })
  }
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
