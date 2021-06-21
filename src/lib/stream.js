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
