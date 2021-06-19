import { randomUUID } from "crypto"
import S from "fluent-json-schema"

const schema = {
  body: S.object().prop("username", S.string().required()),
  response: {
    200: S.object().prop("token", S.string().required()),
  },
}

export default async function login(fastify) {
  fastify.post("/login", { schema }, async (req) => {
    const { username } = req.body

    return { token: fastify.jwt.sign({ username, id: randomUUID() }) }
  })
}
