import S from "fluent-json-schema"
import merge from "lodash.merge"
import { randomUUID } from "crypto"

import config from "../../config.js"
import { read } from "./stream.js"
import validation from "./validation.js"
import { set, get } from "./projection.js"
import { add } from "../lib/stream.js"

const projectionSchema = S.object()
  .prop("body", S.string().required())
  .prop("created", S.string().required())
  .prop("updated", S.string().required())
  .prop("aggregate", S.string().format(S.FORMATS.UUID).required())
  .prop("author", S.string().format(S.FORMATS.UUID).required())
  .prop("revision", S.number().required())
  .prop("topic", S.string().format(S.FORMATS.UUID).required())
  .valueOf()

const eventSchema = S.object()
  .prop("aggregate", S.string().format(S.FORMATS.UUID).required())
  .prop("stream", S.string().required())
  .prop("event", S.string().required())
  .prop(
    "meta",
    S.object()
      .prop("id", S.string().format(S.FORMATS.UUID).required())
      .prop("timestamp", S.string().required())
      .prop("payloadVersion", S.integer().required())
      .prop("revision", S.integer().required())
      .prop("author", S.string().format(S.FORMATS.UUID).required())
  )
  .prop(
    "payload",
    S.object()
      .prop("topic", S.string().format(S.FORMATS.UUID))
      .prop("body", S.string().required())
  )

export default async function projection({ client, event }) {
  console.log("building projection", event)
  // const redisStream = await read({ client, stream: config.EVENT_STREAM })
  // const aggregateRecords = redisStream.filter(
  //   (record) => record.aggregate === event.aggregate
  // )
  //
  // let primeEvent = {
  //   aggregate: aggregateRecords[0]?.aggregate || event.aggregate,
  //   author: aggregateRecords[0]?.meta.author || event.meta.author,
  //   created: aggregateRecords[0]?.meta.timestamp || event.meta.timestamp,
  // }
  //
  // let latestVersion = { ...primeEvent }
  // for (let record of aggregateRecords) {
  //   latestVersion = {
  //     ...latestVersion,
  //     body: record.payload.body,
  //     revision: record.meta.revision,
  //     ...(record.payload.topic && { topic: record.payload.topic }),
  //     updated: record.meta.timestamp,
  //   }
  // }
  //
  // try {
  //   const validProjection = validateProjection({
  //     schema: projectionSchema.valueOf(),
  //     projection: latestVersion,
  //   })
  //   await set({ client, projection: validProjection })
  //   return true
  // } catch (err) {
  //   console.log(err)
  // }
}

export async function fetchProjection({ client, aggregate }) {
  return await get({ client, aggregate })
}

export async function fetchAggregate({ client, aggregate }) {
  const redisStream = await read({ client, stream: config.EVENT_STREAM })
  const filteredStream = redisStream.filter(
    (item) => item.aggregate === aggregate
  )

  let currentState = {}
  for (let event of filteredStream) {
    currentState = applyEvent({ currentState, event })
  }

  return currentState
}

export function createEvent({
  eventName,
  topic,
  body,
  author,
  revision = 1,
  aggregate = randomUUID(),
}) {
  let event = {
    aggregate,
    stream: config.EVENT_STREAM,
    event: eventName,
    meta: {
      author,
      id: randomUUID(),
      timestamp: `${new Date().valueOf()}`,
      payloadVersion: 1,
      revision,
    },
    payload: {
      topic,
      body,
    },
  }

  return event
}

export async function storeEvent({ event, client }) {
  let [[, eventId]] = await add({ client, event })

  return { ...event, eventId }
}

export function applyEvent({ currentState, event }) {
  return merge({}, currentState, event)
}

export function validateEvent({ schema = eventSchema.valueOf(), event }) {
  let validate = validation.compile(schema)

  let valid = validate(event)
  if (!valid) throw new Error(JSON.stringify(validate.errors))

  return event
}

export function validateProjection({
  schema = eventSchema.valueOf(),
  projection,
}) {
  let validate = validation.compile(schema)

  let valid = validate(projection)
  if (!valid) throw new Error(JSON.stringify(validate.errors))

  return projection
}
