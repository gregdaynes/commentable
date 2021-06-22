export async function add({ client, event } = {}) {
  return await client.pipeline().xadd(event.stream, "*", event).exec()
}

export async function read({ client, stream, startingPoint = 0 }) {
  let redisStream = await client
    .pipeline()
    .xread("STREAMS", stream, startingPoint)
    .exec()

  return redisStream[0][1]
}

export async function listenForMessage({
  stream,
  client,
  handler,
  handlerClient,
}) {
  let lastId = "$"
  let locked = false

  if (!handler) throw new Error(`Handler not defined for stream: ${stream}`)

  setInterval(async () => {
    let redisStream = await client.xread(
      "BLOCK",
      "5000",
      "COUNT",
      100,
      "STREAMS",
      stream,
      lastId
    )

    if (!redisStream) return

    let results = redisStream
    if (!results.length) return

    await handler({ client: handlerClient, event: results[0] })

    lastId = results[results.length - 1].id
  }, 1000)
}
