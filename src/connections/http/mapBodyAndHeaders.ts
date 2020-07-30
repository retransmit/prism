import { HttpRequest, BodyObject } from "../../types/http";
import { HttpRouteConfigBase } from "../../types/httpProxy";

export default function mapBodyAndHeaders(
  request: HttpRequest,
  serviceConfig: HttpRouteConfigBase
) {
  const includedFields = serviceConfig.mapping?.fields?.include;
  const excludedFields = serviceConfig.mapping?.fields?.exclude;
  const includedHeaders = serviceConfig.mapping?.headers?.include;
  const excludedHeaders = serviceConfig.mapping?.headers?.exclude;

  return {
    ...request,
    body: mapObject(
      includedFields,
      excludedFields || [],
      request.body as BodyObject | undefined
    ),
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
  requestProp: BodyObject | undefined
) {
  if (requestProp === undefined) return undefined;

  const result: { [field: string]: any } = {};

  const includedFields = included !== undefined ? Object.keys(included) : [];

  for (const field of Object.keys(requestProp)) {
    if (
      !excluded.includes(field) &&
      (included === undefined || includedFields.includes(field))
    ) {
      const fieldName = included === undefined ? field : included[field];
      result[fieldName] = requestProp[field];
    }
  }

  return result;
}
