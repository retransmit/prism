export default function makeUSVStringPairArray(
  args:
    | {
        [key: string]: string | string[] | undefined;
      }
    | undefined
) : [string, string][] {
  const result: [string, string][] = [];
  if (args) {
    for (const key in args) {
      const val = args[key];
      if (typeof val === "string") {
        result.push([key, val]);
      } else if (Array.isArray(val)) {
        for (const item of val) {
          result.push([key, item]);
        }
      }
    }
  }
  return result;
}
