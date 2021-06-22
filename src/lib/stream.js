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
  lastId = "$",
}) {
  if (!handler) throw new Error(`Handler not defined for stream: ${stream}`)

  while (true) {
    let redisStream = await client.xread(
      "BLOCK",
      5000,
      "COUNT",
      100,
      "STREAMS",
      stream,
      lastId
    )

    if (!redisStream || !redisStream.length) {
      continue
    }

    await handler(redisStream)
    lastId = redisStream[redisStream.length - 1].id
  }
}
