import { UrlList, UrlSelector } from "../../types";

export default async function selectRandomUrl(
  urls: UrlList,
  urlSelector: UrlSelector | undefined
) {
  const effectiveUrls = urlSelector ? await urlSelector(urls) : urls;
  return typeof effectiveUrls === "string"
    ? effectiveUrls
    : effectiveUrls[Math.floor(Math.random() * effectiveUrls.length)];
}
