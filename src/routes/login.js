import { randomUUID } from "crypto"
import S from "fluent-json-schema"

export default async function login(fastify) {
  fastify.post(
    "/login",
    {
      schema: {
        body: S.object().prop("username", S.string().required()),
        response: {
          200: S.object().prop("token", S.string().required()),
        },
      },
    },
    async (req) => {
      const { username } = req.body

      return { token: fastify.jwt.sign({ username, id: randomUUID() }) }
    }
  )
}
