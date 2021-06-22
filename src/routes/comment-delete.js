import httpErrors from "http-errors"
import {
  createEvent,
  validateEvent,
  storeEvent,
  applyEvent,
  fetchAggregate,
} from "../lib/comment.js"

export default async function routeComment(fastify) {
  fastify.delete(
    "/comment/:commentId",
    {
      onRequest: [fastify.authenticate],
    },
    async (req) => {
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
        eventName: "commentDeleted",
        body: "[deleted]",
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
