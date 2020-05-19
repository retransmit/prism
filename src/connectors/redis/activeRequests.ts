import { ActiveRedisRequest } from "../../types";

const map = new Map<string, ActiveRedisRequest>();

export function entries() : IterableIterator<[string, ActiveRedisRequest]> {
  return map.entries();
}

export function set(id: string, data: ActiveRedisRequest) {
  map.set(id, data);
}

export function get(id: string): ActiveRedisRequest | undefined {
  return map.get(id);
}

export function remove(id: string) {
  return map.delete(id)
}