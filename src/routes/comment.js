import { randomUUID } from "crypto"
import S from "fluent-json-schema"
import { add, read, readProjection } from "../stream.js"
import httpErrors from "http-errors"

const schema = {
  body: S.object()
    .prop("author", S.string().required())
    .prop("topic", S.string().required())
    .prop("body", S.string().required()),
}

const eventSchema = S.object()
  .prop("aggregate", S.string().format(S.FORMATS.UUID).required())
  .prop("stream", S.string().required())
  .prop("event", S.string().required())
  .prop(
    "meta",
    S.object()
      .prop("id", S.string().format(S.FORMATS.UUID).required())
      .prop("timestamp", S.string().required())
      .prop("payloadVersion", S.integer().required())
      .prop("revision", S.integer().required())
      .prop("author", S.string().format(S.FORMATS.UUID).required())
  )
  .prop(
    "payload",
    S.object()
      .prop("topic", S.string().format(S.FORMATS.UUID).required())
      .prop("body", S.string().required())
  )

export default async function comment(fastify) {
  const produceEvent = add(fastify.redis.producer, eventSchema.valueOf())
  const consumeEvents = read(fastify.redis.consumer)

  fastify.post("/comment", { schema }, async (req) => {
    let { author, body, topic } = req.body

    let event = {
      aggregate: randomUUID(),
      stream: "commentable",
      event: "commentCreated",
      meta: {
        id: randomUUID(),
        timestamp: `${new Date().valueOf()}`,
        payloadVersion: 1,
        revision: 1,
        author,
      },
      payload: {
        topic,
        body,
      },
    }

    let [[, eventId]] = await produceEvent(event)

    return {}
  })

  fastify.put("/comment/:commentId", { schema }, async (req) => {
    let { author, body, topic } = req.body
    let { commentId } = req.params

    const redisStream = await consumeEvents("commentable", 0)
    const filteredStream = redisStream.filter(
      (item) => item.aggregate === commentId
    )

    // TODO apply commit events (filteredStream) to a base object

    // Only the author of the original comment can update
    if (filteredStream[0].meta.author !== author) {
      console.log(filteredStream[0].meta.author, author)
      throw httpErrors.Unauthorized()
    }

    let event = {
      aggregate: commentId,
      stream: "commentable",
      event: "commentUpdated",
      meta: {
        id: randomUUID(),
        timestamp: `${new Date().valueOf()}`,
        payloadVersion: 1,
        revision: filteredStream.length,
        author,
      },
      payload: {
        topic: filteredStream[0].payload.topic,
        body,
      },
    }

    let [[, eventId]] = await produceEvent(event)

    return {}
  })

  fastify.get("/comment/:commentId", async (req) => {
    let { commentId } = req.params

    const projection = await readProjection(fastify.redis.consumer)(commentId)
    console.log(projection)

    return projection[0][1]
  })
}

// http put :3000/comment/72c4977c-b3d4-4c99-9346-23f4ec2c418e author=e3bc1019-7c99-4be7-95be-a464e2b9c2f8 topic=e3bc1019-7c99-4be7-95be-a464e2b9c2f8 body=11
