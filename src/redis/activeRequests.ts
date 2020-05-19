import { TrackedRequest } from "../types";

const map = new Map<string, TrackedRequest>();

export function entries() : IterableIterator<[string, TrackedRequest]> {
  return map.entries();
}

export function set(id: string, data: TrackedRequest) {
  map.set(id, data);
}

export function get(id: string): TrackedRequest | undefined {
  return map.get(id);
}

export function remove(id: string) {
  return map.delete(id)
}