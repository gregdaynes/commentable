import { randomUUID } from "crypto"
import S from "fluent-json-schema"
import { add, read } from "../stream.js"
import { get } from "../projection.js"
import httpErrors from "http-errors"

const schema = {
  body: S.object()
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

const produceEvent = add(eventSchema.valueOf())

export default async function comment(fastify) {
  fastify.post(
    "/comment",
    { schema, onRequest: [fastify.authenticate] },
    async (req) => {
      let { body, topic } = req.body
      let { id: author } = req.user

      let event = {
        aggregate: randomUUID(),
        stream: "commentable",
        event: "commentCreated",
        meta: {
          author,
          id: randomUUID(),
          timestamp: `${new Date().valueOf()}`,
          payloadVersion: 1,
          revision: 1,
        },
        payload: {
          topic,
          body,
        },
      }

      let [[, eventId]] = await produceEvent(event)

      return {
        aggregate: event.aggregate,
        eventId,
      }
    }
  )

  fastify.put(
    "/comment/:commentId",
    { schema, onRequest: [fastify.authenticate] },
    async (req) => {
      let { body } = req.body
      let { commentId } = req.params
      let { id: author } = req.user

      const redisStream = await read("commentable", 0)
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
          body,
        },
      }

      let [[, eventId]] = await produceEvent(event)

      return {}
    }
  )

  fastify.get("/comment/:aggregate", async (req) => {
    let { aggregate } = req.params

    const comment = await get(aggregate)
    console.log(comment)

    return comment[0][1]
  })
}
