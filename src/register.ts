import { HTTPVerbs, Middleware, KaenContext } from "@kaenjs/core";
import { configuration } from "@kaenjs/core/configuration";
import { cyan, grey, yellow } from "@kaenjs/core/c";
import { debug } from '@kaenjs/core/debug';
import { MiddlewareStack, Route, RouterOptions, RouteHooks, MatchConditions } from "./internals";
import { StandardRequestHeaders, StandardResponseHeaders } from "@kaenjs/core/headers";
import { getMetadata } from "./decorator";



const drouter = debug('router');
const {server:{host}} = configuration;
function validateCORS(ctx:KaenContext, cors:string[]) {
	let request = ctx.headers[StandardRequestHeaders.Origin];
	let match = cors.includes('*') || cors.some(origin=>request.includes(origin));
	return match ? ctx.headers[StandardRequestHeaders.Origin] : undefined;

}
let CORS_MW:Middleware=undefined;
function AllowCors(cors: string) {
    return async function CORS(ctx:KaenContext) {
        let COR = validateCORS(ctx, cors.split(',').map(c=>c.trim()));
        ctx.headers[StandardResponseHeaders.AccessControlAllowOrigin] = COR;
    };
	return CORS_MW;
}
function AllowCredentials() {
    return async function AllowCredentials(ctx:KaenContext) {
        ctx.headers[StandardResponseHeaders.AccessControlAllowCredentials] = 'true';
    };
}
function buildOptionRequest(middleware: Middleware, subdomain: string, route: string) {
    let middleware_stack:Middleware[] = [];
    let new_middleware_stack:Middleware[] = [];
    let { cors, allowcredentials } = getMetadata(middleware);
    if (cors || allowcredentials) {
        middleware_stack.push(AllowCors(cors));
        new_middleware_stack.push(AllowCors(cors));
    }
    if(allowcredentials) {
        middleware_stack.push(AllowCredentials());
        new_middleware_stack.push(AllowCredentials());
    }
    if(middleware_stack.length) {
        middleware_stack.push(async ctx=>{
            ctx.headers[StandardResponseHeaders.AccessControlAllowHeaders] = 'content-type';
            ctx.status = 200;
            ctx.finished = true;
        });
        RegisterRoute(subdomain, [HTTPVerbs.options], route, middleware_stack);
    }
    return new_middleware_stack;
}
export function RegisterRoute(subdomain:string, methods:HTTPVerbs[], route: string , stack_middleware:Middleware[], options?: RouterOptions) {
    let subdomain_stack:Map<HTTPVerbs, Array<Route>>;
    if (!configuration.server.subdomains.includes(subdomain)) {
        configuration.server.subdomains.push(subdomain);
    }
    if ( !MiddlewareStack.has(subdomain) ) {
        MiddlewareStack.set(subdomain, new Map());
    }
    subdomain_stack = MiddlewareStack.get(subdomain);
    let method_stack;
    for(const method of methods) {
        if(!subdomain_stack.has(method)) {
            subdomain_stack.set(method, []);
        }
        method_stack = subdomain_stack.get(method);
        for(const middleware of stack_middleware) {
            if(!middleware)continue;
            let appendMiddleware = buildOptionRequest(middleware, subdomain, route);
            for(const middlew of appendMiddleware) {
                method_stack.push(new Route(route, middlew, options));
            }
            method_stack.push(new Route(route, middleware, options));
            
        }
    }
    drouter(`${grey('[')}${yellow(methods.join(', '))}${grey(']')}\t${cyan(subdomain)}.${grey(host)}${cyan(route)}`);
}



export function RegisterHook(fn:()=>void) {
    RouteHooks.push(fn);
    return RouteHooks.indexOf(fn);
}

export function addMatchCondition (fn:(route:Route, ctx:KaenContext)=>boolean) {
    MatchConditions.push(fn);
}