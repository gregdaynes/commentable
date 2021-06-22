export function stringifyNestedObjects(obj) {
  let nestedObjects = {}

  for (let [key, value] of Object.entries(obj)) {
    if (typeof value === "object" && value !== null) {
      nestedObjects[key] = JSON.stringify(value)
    }
  }

  return {
    ...obj,
    ...nestedObjects,
  }
}
