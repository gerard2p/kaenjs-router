import { MiddlewareStack, MatchConditions } from "./internals";
import { HTTPVerbs, KaenContext, Middleware } from "@kaenjs/core";

export async function RouterMiddleware(context: KaenContext) {
    // let anytime = getTimeMSFloat();
    const middleware = MiddlewareStack.get(context.subdomain);
    if(!middleware)return;
    let routes = middleware.get(context.req.method as HTTPVerbs) || [];
    for(const route of routes){
        let match = route.match(context.url.path);
        // let auth = !route.isProtected || (route.isProtected && context.isLogged);
        if(match) {
            // context.status = 200;
            // context.state.time = getTimeMSFloat();
            let matchConditions = !MatchConditions.some(condition => !condition(route, context));
            if(matchConditions) {
                context.status = 404;
                await route.call()(context, ...match);
                if(context.body && context.status === 404)context.status = 200;
            }
            // console.log(route.call().name, Math.round((getTimeMSFloat() - context.state.time) * 10000) / 10000);
            if(context.res.finished || context.finished)return;
        }
    }
    // console.log('inner execute', Math.round((getTimeMSFloat() - anytime) * 10000) / 10000);
}