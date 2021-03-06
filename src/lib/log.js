import pino from "pino"

let instances = {}

export default function createLog({ namespace = "default", config = {} } = {}) {
  if (namespace && instances[namespace]) {
    return instances[namespace]
  }

  const log = pino({
    level: config.LOG_LEVEL || "info",
  })

  if (namespace) {
    instances[namespace] = log
    return instances[namespace]
  }

  return log
}
