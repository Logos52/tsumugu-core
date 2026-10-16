

import { legacyRedirectTarget, routeFor } from "./router.js";


interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

export interface Env {
  
  CORE: Fetcher;
  
  ED: Fetcher;
  
  PRIMARY_HOST: string;
  
  LEGACY_HOST: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    
    if (url.hostname === env.LEGACY_HOST || url.hostname === `www.${env.LEGACY_HOST}`) {
      return Response.redirect(legacyRedirectTarget(request.url, env.PRIMARY_HOST), 301);
    }

    
    return routeFor(url.pathname) === "ed" ? env.ED.fetch(request) : env.CORE.fetch(request);
  },
};
