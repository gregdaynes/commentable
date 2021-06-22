import httpErrors from "http-errors"
import S from "fluent-json-schema"
import {
  createEvent,
  validateEvent,
  storeEvent,
  applyEvent,
  fetchAggregate,
} from "../lib/comment.js"

const schema = {
  body: S.object()
    .prop("topic", S.string().required())
    .prop("body", S.string().required()),
}

export default async function routeComment(fastify) {
  fastify.put(
    "/comment/:commentId",
    {
      schema,
      onRequest: [fastify.authenticate],
    },
    async (req) => {
      let { body } = req.body
      let { commentId: aggregate } = req.params
      let { id: author } = req.user
      let client = fastify.redis

      const currentState = await fetchAggregate({ client, aggregate })

      if (!currentState.meta) {
        throw httpErrors.NotAcceptable()
      }

      if (currentState.meta.author !== author) {
        throw httpErrors.Unauthorized()
      }

      let event = createEvent({
        eventName: "commentUpdated",
        body,
        aggregate,
        revision: currentState.meta.revision + 1,
      })

      let newState = applyEvent({ currentState, event })
      try {
        const validEvent = validateEvent({ event: newState })
        const { eventId } = await storeEvent({
          event: validEvent,
          client: fastify.redis,
        })

        return { eventId, aggregate }
      } catch (err) {
        throw httpErrors.NotAcceptable()
      }
    }
  )
}
