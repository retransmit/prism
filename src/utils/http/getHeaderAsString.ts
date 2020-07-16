export function getHeaderAsString(val: string | string[] | undefined): string | undefined {
  return typeof val !== "undefined"
    ? Array.isArray(val)
      ? val.length > 0
        ? val[0]
        : undefined
      : val
    : undefined;
}
