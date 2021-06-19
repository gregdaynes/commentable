import fp from "fastify-plugin"
import fastifyRedis from "fastify-redis"

export default fp(async (fastify, options) => {
  await fastify.register(fastifyRedis, {
    client: options.redis,
    closeClient: true,
  })
})
