import { read } from "../stream.js"

export default async function comment(fastify) {
  const consumeEvents = read(fastify.redis.consumer)

  fastify.get("/comments", async () => {
    let redisStream = await consumeEvents("commentable", 0)

    return { redisStream }
  })
}
