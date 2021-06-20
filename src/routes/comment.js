import { randomUUID } from "crypto"
import S from "fluent-json-schema"
import { add, read } from "../lib/stream.js"
import { get } from "../lib/redis.js"
import httpErrors from "http-errors"
import merge from "lodash.merge"

const schema = {}

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
      .prop("topic", S.string().format(S.FORMATS.UUID))
      .prop("body", S.string().required())
  )
  .valueOf()

export default async function comment(fastify) {
  const produceEvent = add({
    schema: eventSchema,
    client: fastify.redis,
  })

  fastify.post(
    "/comment",
    {
      schema: {
        body: S.object()
          .prop("topic", S.string().required())
          .prop("body", S.string().required()),
      },
      onRequest: [fastify.authenticate],
    },
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
    {
      schema: {
        body: S.object().prop("body", S.string().required()),
      },
      onRequest: [fastify.authenticate],
    },
    async (req) => {
      let { body } = req.body
      let { commentId } = req.params
      let { id: author } = req.user

      const redisStream = await read(fastify.redis)({ stream: "commentable" })
      const filteredStream = redisStream.filter(
        (item) => item.aggregate === commentId
      )

      // Only the author of the original comment can update
      if (filteredStream[0].meta.author !== author) {
        console.log(filteredStream[0].meta.author, author)
        throw httpErrors.Unauthorized()
      }

      let currentState = {}
      for (let commitedEvent of filteredStream) {
        currentState = merge(currentState, commitedEvent)
      }

      let event = {
        aggregate: commentId,
        stream: "commentable",
        event: "commentUpdated",
        meta: {
          id: randomUUID(),
          timestamp: `${new Date().valueOf()}`,
          payloadVersion: 1,
          revision: currentState.meta.revision + 1,
          author,
        },
        payload: {
          body,
        },
      }

      let newState = merge({}, currentState, event)
      // TODO validate new state

      let [[, eventId]] = await produceEvent(event)

      return {}
    }
  )

  fastify.get(
    "/comment/:aggregate",
    { onRequest: [fastify.authenticate] },
    async (req) => {
      let { aggregate } = req.params

      const comment = await get(fastify.redis)(aggregate)
      console.log(comment)

      return comment
    }
  )
}
