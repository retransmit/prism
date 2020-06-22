import { HttpRequest } from "../../types";
import { HttpRequestHandlerConfigBase } from "../../types/http";

export default function mapBodyAndHeaders(
  request: HttpRequest,
  serviceConfig: HttpRequestHandlerConfigBase
) {
  const includedFields = serviceConfig.mapping?.fields?.include;
  const excludedFields = serviceConfig.mapping?.fields?.exclude;
  const includedHeaders = serviceConfig.mapping?.headers?.include;
  const excludedHeaders = serviceConfig.mapping?.headers?.exclude;

  return {
    ...request,
    body: mapObject(includedFields, excludedFields || [], request.body),
    headers: request.headers
      ? mapObject(includedHeaders, excludedHeaders || [], request.headers)
      : undefined,
  };
}

type Mapping = {
  [name: string]: string;
};

function mapObject(
  included: Mapping | undefined,
  excluded: string[],
  defaultValue: { [field: string]: any } | undefined
) {
  if (defaultValue === undefined) return undefined;

  const result: { [field: string]: any } = {};

  const includedFields = included !== undefined ? Object.keys(included) : [];

  for (const field of Object.keys(defaultValue)) {
    if (
      !excluded.includes(field) &&
      (included === undefined || includedFields.includes(field))
    ) {
      const fieldName = included === undefined ? field : included[field];
      result[fieldName] = defaultValue[field];
    }
  }

  return result;
}
