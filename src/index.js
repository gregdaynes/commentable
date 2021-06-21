import { join } from "desm"
import Fastify from "fastify"
import autoload from "fastify-autoload"
import fastifyRedis from "fastify-redis"
import fastifyJwt from "fastify-jwt"

export default async function buildServer(options) {
  const fastify = Fastify(options)

  fastify.register(fastifyRedis, { client: options.redis, closeClient: true })
  fastify.register(fastifyJwt, { secret: options.JWT_SECRET })
  fastify.decorate("authenticate", async (req, reply) => {
    try {
      await req.jwtVerify()
    } catch (err) {
      reply.send(err)
    }
  })

  fastify.register(autoload, {
    dir: join(import.meta.url, "routes"),
    options,
  })

  fastify.log.info(`${options.APP_NAME} is starting!`)

  return fastify
}
