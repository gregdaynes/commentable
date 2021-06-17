import { join } from "desm"
import Fastify from "fastify"
import autoload from "fastify-autoload"

export default async function buildServer(config) {
  const opts = {
    ...config,
    logger: {
      level: config.LOG_LEVEL,
    },
  }

  const fastify = Fastify(opts)

  fastify.register(autoload, {
    dir: join(import.meta.url, "plugins"),
    options: opts,
  })

  fastify.register(autoload, {
    dir: join(import.meta.url, "routes"),
    options: opts,
  })

  fastify.log.info(`${config.APP_NAME} is starting!`)

  return fastify
}
