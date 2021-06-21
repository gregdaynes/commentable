export async function set({ client, projection }) {
  return await client
    .pipeline()
    .hset(projection.aggregate, Object.entries(projection).flat())
    .exec()
}

export async function get({ client, aggregate }) {
  return await client.hgetall(aggregate)
}
