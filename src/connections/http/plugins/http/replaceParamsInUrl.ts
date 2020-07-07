export function replaceParamsInUrl(
  params: {
    [key: string]: string;
  } | undefined,
  url: string
) {
  return params
    ? Object.keys(params).reduce((acc, param) => {
        return acc.replace(`/:${param}`, `/${params[param]}`);
      }, url)
    : url;
}
