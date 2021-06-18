import { randomUUID } from "crypto"
import S from "fluent-json-schema"
import { add, read } from "../stream.js"

const schema = {
  body: S.object()
    .prop("author", S.string().required())
    .prop("topic", S.string().required())
    .prop("body", S.string().required()),
}

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
      .prop("author", S.string().format(S.FORMATS.UUID).required())
  )
  .prop(
    "payload",
    S.object()
      .prop("topic", S.string().format(S.FORMATS.UUID).required())
      .prop("body", S.string().required())
  )

export default async function comment(fastify) {
  const produceEvent = add(fastify.redis.producer, eventSchema.valueOf())
  const consumeEvents = read(fastify.redis.consumer)

  fastify.post("/comment", { schema }, async (req) => {
    let { author, body, topic } = req.body

    let event = {
      aggregate: randomUUID(),
      stream: "commentable",
      event: "commentCreated",
      meta: {
        id: randomUUID(),
        timestamp: `${new Date().valueOf()}`,
        payloadVersion: 1,
        author,
      },
      payload: {
        topic,
        body,
      },
    }

    let [[, eventId]] = await produceEvent(event)

    return {}
  })

  fastify.put("/comment/:commentId", { schema }, async (req) => {
    let { author, body, topic } = req.body

    const x = await consumeEvents("commentable", 0)

    // console.log(x[0][1].map((y) => y[1]))

    return {}
  })
}

// http put :3000/comment/72c4977c-b3d4-4c99-9346-23f4ec2c418e author=e3bc1019-7c99-4be7-95be-a464e2b9c2f8 topic=e3bc1019-7c99-4be7-95be-a464e2b9c2f8 body=11
//Redis.Command.setArgumentTransformer('xadd', function (args) {
//   if (args.length === 3) {
//     const argArray = [];
//
//     argArray.push(args[0], args[1]); // Key Name & ID.
//
//     // Transform object into array of field name then value.
//     const fieldNameValuePairs = args[2];
//
//     for (const fieldName in fieldNameValuePairs) {
//       argArray.push(fieldName, fieldNameValuePairs[fieldName]);
//     }
//
//     return argArray;
//   }
//
//   return args;
// });
