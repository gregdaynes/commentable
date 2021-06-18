import fp from "fastify-plugin"
import fastifyRedis from "fastify-redis"
import { config } from "../stream.js"

const { host, port } = config

export default fp(async (fastify) => {
  await fastify.register(fastifyRedis, {
    host,
    port,
    namespace: "consumer",
  })

  await fastify.register(fastifyRedis, {
    host,
    port,
    namespace: "producer",
  })
})
