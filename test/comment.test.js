import { test } from "tap"
import fastify from "fastify"
import errors from "http-errors"

function buildServer() {
  return fastify().register(import("../src/routes/comment.js"))
}

test("GET /comment", async (t) => {
  t.test("stuff", async (t) => {
    const fastify = buildServer()

    t.equal(1, 1)
  })
})
