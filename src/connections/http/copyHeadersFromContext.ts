/*
  Don't copy the content-type and content-length headers.
  That's going to differ based on the backend service.
*/
export function copyHeadersFromContext(headers: { [field: string]: string }) {
  return Object.keys(headers || {}).reduce(
    (acc, field) =>
      !["content-type", "content-length"].includes(field.toLowerCase())
        ? ((acc[field.toLowerCase()] = headers[field]), acc)
        : acc,
    {} as { [field: string]: string }
  );
}
