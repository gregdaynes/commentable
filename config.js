import { join } from "desm"
import envSchema from "env-schema"
import S from "fluent-json-schema"

const schema = S.object()
  .prop("APP_NAME", S.string().required())
  .prop("HOST", S.string().default("127.0.0.1"))
  .prop("JWT_SECRET", S.string().required())
  .prop("LOG_LEVEL", S.string().default("info"))
  .prop("PORT", S.number().default(3000))
  .prop("REDIS_PORT", S.number().default(6379))
  .prop("REDIS_HOST", S.string().default("127.0.0.1"))
  .prop("EXTERNAL_STREAM_SUBSCRIBERS", S.boolean().default(false))

export default envSchema({
  schema,
  dotenv: { path: join(import.meta.url, ".env") },
})
