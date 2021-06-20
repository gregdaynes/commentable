import { read } from "./lib/stream.js"
import { set } from "./lib/redis.js"
import S from "fluent-json-schema"

const schema = S.object()
  .prop("body", S.string().required())
  .prop("created", S.string().required())
  .prop("updated", S.string().required())
  .prop("aggregate", S.string().format(S.FORMATS.UUID).required())
  .prop("author", S.string().format(S.FORMATS.UUID).required())
  .prop("revision", S.number().required())
  .prop("topic", S.string().format(S.FORMATS.UUID).required())
  .valueOf()

export default function projection(client) {
  return async function projection([event]) {
    const redisStream = await read(client)({ stream: "commentable" })

    const aggregateRecords = redisStream.filter(
      (record) => record.aggregate === event.aggregate
    )

    let primeEvent = {
      aggregate: aggregateRecords[0]?.aggregate || event.aggregate,
      author: aggregateRecords[0]?.meta.author || event.meta.author,
      created: aggregateRecords[0]?.meta.timestamp || event.meta.timestamp,
    }

    let latestVersion = { ...primeEvent }
    for (let record of aggregateRecords) {
      latestVersion = {
        ...latestVersion,
        body: record.payload.body,
        revision: record.meta.revision,
        ...(record.payload.topic && { topic: record.payload.topic }),
        updated: record.meta.timestamp,
      }
    }

    await set({ schema, client })(latestVersion)
  }
}
