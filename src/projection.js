import Redis from "./lib/redis.js"
import validation from "./lib/validation.js"
import { read } from "./stream.js"
import config from "../config.js"
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

export function set({ schema, client }) {
  let validate = schema ? validation.compile(schema) : undefined

  return async function set(projection) {
    if (validate) {
      let valid = validate(projection)
      if (!valid) throw new Error(JSON.stringify(validate.errors))
    }

    // NOTE setting a namespace here will only be effective in single process mode.
    // the connection cannot be shared across processes
    return await client
      .pipeline()
      .hset(projection.aggregate, Object.entries(projection).flat())
      .exec()
  }
}

export function get(client) {
  return async function get(aggregate) {
    // NOTE setting a namespace here will only be effective in single process mode.
    // the connection cannot be shared across processes
    try {
      return await client.hgetall(aggregate)
    } catch (err) {
      console.log("big nasty error get", err)
    }
  }
}

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
        topic: record.payload.topic,
        updated: record.meta.timestamp,
      }
    }

    console.log("here I am", latestVersion)

    await set({ schema, client })(latestVersion)
  }
}
