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

export function set(schema) {
  let validate = schema ? validation.compile(schema) : undefined

  return async function set(projection) {
    if (validate) {
      let valid = validate(projection)
      if (!valid) throw new Error(JSON.stringify(validate.errors))
    }

    // NOTE setting a namespace here will only be effective in single process mode.
    // the connection cannot be shared across processes
    return await Redis()
      .pipeline()
      .hset(projection.aggregate, Object.entries(projection).flat())
      .exec()
  }
}

export function get() {
  async function get(aggregate) {
    // NOTE setting a namespace here will only be effective in single process mode.
    // the connection cannot be shared across processes
    try {
      return await Redis().hgetall(aggregate)
    } catch (err) {
      console.log("big nasty error get", err)
    }
  }

  // allow direct calling
  if (arguments) return get(arguments)

  // enable similar interface to set even though a config is not used
  return get
}

// TODO determine if the event here is really an array of events, or one event always in an array
export default async function projection([event]) {
  const redisStream = await read(config.EVENT_STREAM)
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

  await set(schema.valueOf())(latestVersion)
}
