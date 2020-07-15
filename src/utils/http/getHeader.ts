export default function getHeader(
  headers: { [field: string]: string | string[] | undefined } | undefined,
  field: string
): string | undefined {
  if (headers) {
    const matchingField = headers
      ? Object.keys(headers).find((x) => x.toLowerCase() === field)
      : undefined;

    const value = matchingField ? (headers as any)[matchingField] : undefined;

    return typeof value !== "undefined" && Array.isArray(value)
      ? value.length > 0
        ? value[0]
        : undefined
      : value;
  }
}
