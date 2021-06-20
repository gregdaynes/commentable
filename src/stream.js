import validation from "./lib/validation.js"

export function add({ schema, client }) {
  let validate = schema ? validation.compile(schema) : undefined

  return async function (event, xclient = client) {
    if (validate) {
      let valid = validate(event)
      if (!valid) throw new Error(JSON.stringify(validate.errors))
    }

    return await xclient.pipeline().xadd(event.stream, "*", event).exec()
  }
}

export function read(client) {
  return async function read({ stream, startingPoint = 0 }) {
    let redisStream = await client
      .pipeline()
      .xread("STREAMS", stream, startingPoint)
      .exec()

    return redisStream[0][1]
  }
}

export async function listenForMessage({
  stream,
  client,
  handler,
  lastId = "$",
}) {
  if (!handler) throw new Error(`Handler not defined for stream: ${stream}`)
  // TODO What about a mechanism to pause the subscription
  // or even throttle the checks on a timer. Would need some
  // sort of resume normal operations as well.
  while (true) {
    let redisStream = await client.xread(
      "BLOCK",
      "5000",
      "COUNT",
      100,
      "STREAMS",
      stream,
      lastId
    )
    if (!redisStream) continue

    let results = redisStream
    if (!results.length) continue

    await handler(results)
    lastId = results[results.length - 1].id
  }
}
