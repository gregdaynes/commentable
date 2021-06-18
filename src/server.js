import buildServer from "./index.js"
import config from "../config.js"
import { subscribe } from "./stream.js"

const fastify = await buildServer(config)

try {
  await fastify.listen(config.PORT)

  await subscribe("commentable", console.log)
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
