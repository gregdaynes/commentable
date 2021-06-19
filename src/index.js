import { join } from "desm"
import Fastify from "fastify"
import autoload from "fastify-autoload"

export default async function buildServer(config) {
  const options = {
    ...config,
    logger: {
      level: config.LOG_LEVEL,
    },
  }

  const fastify = Fastify(options)

  fastify.register(autoload, {
    dir: join(import.meta.url, "plugins"),
    options,
  })

  fastify.register(autoload, {
    dir: join(import.meta.url, "routes"),
    options,
  })

  fastify.log.info(`${config.APP_NAME} is starting!`)

  return fastify
}
