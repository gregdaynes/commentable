import { read, saveProjection, config } from "./stream.js"
import redis from "ioredis"

let client = redis.createClient(config)

// TODO we probably want to have a separate instance of
// the redis client here. This comes from the subscribe
// TODO determine if the event here is really an array of events, or one event always in an array
export default async function projection([event], redisClient) {
  const consumeEvents = read(redisClient)

  const redisStream = await consumeEvents("commentable", 0)
  const filteredStream = redisStream.filter(
    (item) =>
      item.aggregate === event.aggregate && item.meta.id !== event.meta.id
  )

  console.log("start projection")
  console.log("start", filteredStream)

  let primeEvent = {}
  if (filteredStream[0]) {
    primeEvent.aggregate = filteredStream[0].aggregate
    primeEvent.created = filteredStream[0].meta.timestamp
    primeEvent.author = filteredStream[0].meta.author
  } else {
    primeEvent.aggregate = event.aggregate
    primeEvent.created = event.meta.timestamp
    primeEvent.author = event.meta.author
  }

  let latestVersion = { ...primeEvent }

  console.log("pre loop", latestVersion)

  for (let commitedEvent of filteredStream) {
    latestVersion.topic = commitedEvent.payload.topic
    latestVersion.body = commitedEvent.payload.body

    latestVersion.revision = commitedEvent.meta.revision
    latestVersion.updated = commitedEvent.meta.timestamp
  }

  console.log("after loop", latestVersion)

  let newEventApplied = Object.assign(latestVersion, {
    topic: event.payload.topic,
    revision: event.meta.revision,
    body: event.payload.body,
    updated: event.meta.timestamp,
  })

  console.log("applied", newEventApplied)
  console.log("end projection")

  console.log("saving prjection")
  const x = await saveProjection(client)(newEventApplied)
  console.log("saved projection", x)
}
