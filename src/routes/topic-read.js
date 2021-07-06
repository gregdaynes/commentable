import { fetchProjection } from "../lib/comment.js"

export default async function routeComment(fastify) {
  fastify.get(
    "/comment/:aggregate",
    { onRequest: [fastify.authenticate] },
    async (req) => {
      let { aggregate } = req.params

      return await fetchProjection({
        client: fastify.redis,
        aggregate,
      })
    }
  )
}
