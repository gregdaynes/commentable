import httpErrors from "http-errors"
import S from "fluent-json-schema"
import { createEvent, validateEvent, storeEvent } from "../lib/comment.js"

const schema = {
  body: S.object()
    .prop("topic", S.string().required())
    .prop("body", S.string().required()),
}

export default async function routeComment(fastify) {
  fastify.post(
    "/comment",
    {
      schema,
      onRequest: [fastify.authenticate],
    },
    async (req) => {
      let { body, topic } = req.body
      let { id: author } = req.user

      const event = createEvent({
        eventName: "commentCreated",
        topic,
        body,
        author,
      })

      try {
        const validEvent = validateEvent({ event })
        const { aggregate, eventId } = await storeEvent({
          event: validEvent,
          client: fastify.redis,
        })

        return { aggregate, eventId }
      } catch (err) {
        fastify.log.error(err)
        throw httpErrors.NotAcceptable()
      }
    }
  )
}
