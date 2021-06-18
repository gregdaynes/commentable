import buildServer from "./index.js"
import config from "../config.js"
import { subscribe } from "./stream.js"
import projection from "./projection.js"

const fastify = await buildServer(config)

try {
  await fastify.listen(config.PORT)

  await subscribe("commentable", projection)
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
