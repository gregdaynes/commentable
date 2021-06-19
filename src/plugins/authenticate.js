import fastifyJwt from "fastify-jwt"

export default async function authenticate(fastify, opts) {
  fastify.register(fastifyJwt, {
    secret: opts.JWT_SECRET,
  })

  fastify.decorate("authenticate", async (req, reply) => {
    try {
      await req.jwtVerify()
    } catch (err) {
      reply.send(err)
    }
  })
}

authenticate[Symbol.for("skip-override")] = true
