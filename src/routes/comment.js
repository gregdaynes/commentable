import S from "fluent-json-schema"

const schema = {
  body: S.object()
    .prop("author", S.string().required())
    .prop("topic", S.string().required())
    .prop("body", S.string().required()),
}

export default async function comment(fastify) {
  fastify.post("/comment", { schema }, async (req) => {
    let { author, body, topic } = req.body

    await fastify.redis.consumer
      .pipeline()
      .xadd(["topic", "*", "author", author, "topic", topic, "body", body])
      .exec()

    return {}
  })

  fastify.get("/comments", async () => {
    let redisStream = await fastify.redis.consumer
      .pipeline()
      .xread("STREAMS", "topic", 0)
      .exec()

    return { redisStream }
  })
}
