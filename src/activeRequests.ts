import { RequestData } from "./types";

const map = new Map<string, RequestData>();

export function entries() : IterableIterator<[string, RequestData]> {
  return map.entries();
}

export function set(id: string, data: RequestData) {
  map.set(id, data);
}

export function get(id: string): RequestData | undefined {
  return map.get(id);
}

export function remove(id: string) {
  return map.delete(id)
}