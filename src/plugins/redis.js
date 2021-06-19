import fp from "fastify-plugin"
import fastifyRedis from "fastify-redis"
import Redis from "../lib/redis.js"

export default fp(async (fastify) => {
  await fastify.register(fastifyRedis, {
    client: Redis(),
    closeClient: true,
  })
})
