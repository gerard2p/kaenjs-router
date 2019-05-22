import { HTTPVerbs, KaenContext, Middleware } from "@kaenjs/core";
import { cyan, grey, yellow } from "@kaenjs/core/c";
import { configuration } from "@kaenjs/core/configuration";
import { debug } from '@kaenjs/core/debug';
import { StandardRequestHeaders, StandardResponseHeaders } from "@kaenjs/core/headers";
import { MatchConditions, MiddlewareStack, Route, RouteHooks, RouterOptions } from "./internals";
import { getMetadata } from "./metadata";

const drouter = debug('router');
const {server:{host}} = configuration;
function validateCORS(ctx:KaenContext, cors:string[]) {
	let request = ctx.headers[StandardRequestHeaders.Origin] || '';
	let match = cors.includes('*') || cors.some(origin=>request.includes(origin));
	return match ? ctx.headers[StandardRequestHeaders.Origin] : undefined;

}
function AllowOrigin(cors: string) {
    return async function AllowOrigin(ctx:KaenContext) {
        let COR = validateCORS(ctx, cors.split(',').map(c=>c.trim()));
        if(!COR) {
            ctx.status = 418;
            ctx.finished = true;
        } else {
            ctx.headers[StandardResponseHeaders.AccessControlAllowOrigin] = COR;
        }
        
    };
}
function AllowCredentials() {
    return async function AllowCredentials(ctx:KaenContext) {
        ctx.headers[StandardResponseHeaders.AccessControlAllowCredentials] = 'true';
    };
}
function AllowMethods(method:string) {
	return async function AllowMethods(ctx:KaenContext) {
        ctx.headers[StandardResponseHeaders.AccessControlAllowMethods] = ctx.headers[StandardRequestHeaders.AccessControlRequestMethod];
	}
}
function buildCORSRequest(middleware: Middleware, subdomain: string, route: string, method:string) {
    let middleware_stack:Middleware[] = [];
    let new_middleware_stack:Middleware[] = [];
    let { access_control_allow={headers:[]} } = getMetadata(middleware);
    if (access_control_allow.origin) {
        middleware_stack.push(AllowOrigin(access_control_allow.origin));
        new_middleware_stack.push(AllowOrigin(access_control_allow.origin));
    }
    if(access_control_allow.credentials) {
        middleware_stack.push(AllowCredentials());
        new_middleware_stack.push(AllowCredentials());
    }
    if(access_control_allow.methods) {
        middleware_stack.push(AllowMethods(method));
    }
    if(access_control_allow.origin && middleware_stack.length) {
		let cors_headers = (access_control_allow.headers||[]).map(ch=>ch.toLocaleLowerCase());
    	if(!cors_headers.includes('content-type'))cors_headers.push('content-type');
        middleware_stack.push(async ctx=>{
            ctx.headers[StandardResponseHeaders.AccessControlAllowHeaders] = cors_headers.join(',');
            ctx.status = 200;
            if(method.toLocaleLowerCase() === 'options')
                ctx.finished = true;
        });
        RegisterRoute(subdomain, [HTTPVerbs.options], route, middleware_stack);
    }
    return new_middleware_stack;
}
export function RegisterRoute(subdomain:string, methods:HTTPVerbs[], route: string , stack_middleware:Middleware[], options?: RouterOptions, thisContext?:any, hide_register_message?:boolean) {
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
            let appendMiddleware = buildCORSRequest(middleware, subdomain, route, method);
            for(const middlew of appendMiddleware) {
                method_stack.push(new Route(route, middlew.bind(thisContext), options));
            }
            method_stack.push(new Route(route, middleware.bind(thisContext), options));
            
        }
    }
    if(!hide_register_message)
        drouter(`${grey('[')}${yellow(methods.join(', '))}${grey(']')}\t${cyan(subdomain)}.${grey(host)}${cyan(route)}`);
}

export function RegisterHook(fn:()=>void) {
    RouteHooks.push(fn);
    return RouteHooks.indexOf(fn);
}

export function addMatchCondition (fn:(route:Route, ctx:KaenContext)=>boolean) {
    MatchConditions.push(fn);
}