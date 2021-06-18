import { read, saveProjection } from "./stream.js"

// TODO we probably want to have a separate instance of
// the redis client here. This comes from the subscribe
export default async function projection(event, redisClient) {
  const consumeEvents = read(redisClient)

  const redisStream = await consumeEvents("commentable", 0)
  const filteredStream = redisStream.filter(
    (item) =>
      item.aggregate === event[0].aggregate && item.meta.id !== event[0].meta.id
  )

  let latestVersion = {
    id: filteredStream[0].aggregate,
    created: filteredStream[0].meta.timestamp,
    author: filteredStream[0].meta.author,
  }

  for (let commitedEvent of filteredStream) {
    latestVersion.topic = commitedEvent.payload.topic
    latestVersion.revision = commitedEvent.meta.revision
    latestVersion.body = commitedEvent.payload.body
    latestVersion.updated = commitedEvent.meta.timestamp
  }

  let newEventApplied = Object.assign(latestVersion, {
    topic: event[0].payload.topic,
    revision: event[0].meta.revision,
    body: event[0].payload.body,
    updated: event[0].meta.timestamp,
  })

  await saveProjection(redisClient)(newEventApplied)
}
