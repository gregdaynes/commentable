export async function set({ namespace, client, projection }) {
  let key = namespace
    ? `${namespace}:${projection.aggregate}`
    : projection.aggregate

  return await client
    .pipeline()
    .hset(key, Object.entries(projection).flat())
    .exec()
}

export async function get({ namespace, client, aggregate }) {
  let key = namespace ? `${namespace}:${aggregate}` : aggregate

  return await client.hgetall(key)
}
