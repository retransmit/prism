import { HttpRequest } from "../../types";
import { HttpRequestHandlerConfigBase } from "../../types/http";

export default function mapBodyAndHeaders(
  request: HttpRequest,
  serviceConfig: HttpRequestHandlerConfigBase
) {
  const mappedFields = serviceConfig.mapping?.fields;
  const mappedHeaders = serviceConfig.mapping?.headers;

  return {
    ...request,
    body: mapObject(mappedFields, request.body),
    headers: request.headers
      ? mapObject(mappedHeaders, request.headers)
      : undefined,
  };
}

function mapObject(
  mappedFields:
    | {
        [name: string]: string;
      }
    | undefined,
  defaultValue: { [field: string]: any }
) {
  return mappedFields
    ? Object.keys(mappedFields).reduce(
        (acc, fieldName) => (
          (acc[mappedFields[fieldName]] = defaultValue[fieldName]), acc
        ),
        {} as { [field: string]: any }
      )
    : defaultValue;
}
