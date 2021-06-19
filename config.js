import { join } from "desm"
import envSchema from "env-schema"
import S from "fluent-json-schema"

const schema = S.object()
  .prop("APP_NAME", S.string().required())
  .prop("EVENT_STREAM", S.string().default("commentable"))
  .prop("HTTP_HOST", S.string().default("127.0.0.1"))
  .prop("HTTP_PORT", S.number().default(3000))
  .prop("JWT_SECRET", S.string().required())
  .prop("LOG_LEVEL", S.string().default("info"))
  .prop("REDIS_CONNECTION", S.string().default("redis://127.0.0.1:6379"))
  .prop("SINGLE_PROCESS_MODE", S.boolean().default(true))

export default envSchema({
  schema,
  dotenv: { path: join(import.meta.url, ".env") },
})
