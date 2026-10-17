

const DICT_PREFIXES: readonly RegExp[] = [
  /^\/c(\/|$)/, 
  /^\/w(\/|$)/, 
  /^\/g(\/|$)/, 
  /^\/browse(\/|$|\?)/, 
  new RegExp("^/dict-assets/"), 
];

type RouteTarget = "ed" | "core";

export function routeFor(pathname: string): RouteTarget {
  return DICT_PREFIXES.some((re) => re.test(pathname)) ? "ed" : "core";
}

export function legacyRedirectTarget(
  requestUrl: string,
  primaryHost: string,
): string {
  const dest = new URL(requestUrl);
  dest.protocol = "https:";
  dest.hostname = primaryHost;
  dest.port = "";
  return dest.toString();
}
