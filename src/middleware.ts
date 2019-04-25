import { MiddlewareStack, MatchConditions } from "./internals";
import { HTTPVerbs, KaenContext, Middleware } from "@kaenjs/core";

export async function RouterMiddleware(context: KaenContext) {
    const middleware = MiddlewareStack.get(context.subdomain);
    if(!middleware)return;
    let routes = middleware.get(context.req.method as HTTPVerbs) || [];
    for(const route of routes){
        let match = route.match(context.url.path);
        if(match) {
            let matchConditions = !MatchConditions.some(condition => !condition(route, context));
            if(matchConditions) {
                context.status = 404;
                await route.call()(context, ...match);
                if(context.body && context.status === 404)context.status = 200;
            }
            if(context.res.finished || context.finished)return;
        }
    }
}