import { HTTPVerbs, KaenContext, Middleware } from "@kaenjs/core";
import { cyan, grey, yellow } from "@kaenjs/core/c";
import { configuration } from "@kaenjs/core/configuration";
import { debug } from '@kaenjs/core/debug';
import { posix } from "path";
const drouter = debug('router');
const {server:{host}} = configuration;
type middlewareWS = (context:WSContext, ...args:any[]) => void;
export enum RouterOptions {
    SECURE = 1 << 0,
    WS = 1 << 1
}
const RESTVerbs = [HTTPVerbs.get, HTTPVerbs.post, HTTPVerbs.put, HTTPVerbs.patch, HTTPVerbs.delete];

function RouterStackMethod(target, key:string, descriptor) {
    if(descriptor === undefined) {
      descriptor = Object.getOwnPropertyDescriptor(target, key);
    }
	descriptor.value = function (route:string, opt: any, fl:any, ...fn: Middleware[] ) : Router {
		let middleware:Middleware[] = [];
		let options:RouterOptions;
		let method:HTTPVerbs = key.toUpperCase() as HTTPVerbs;
		if(typeof opt === 'string') {
			fl = opt;
			opt = undefined;
		}
		if(typeof fl === 'string'){
			fn = [async (ctx:KaenContext) => {
				//@ts-ignore
				if(ctx.send) {
					//@ts-ignore
					ctx.send(fl);
				} else {
					console.warn('@kaenjs/static is required for this mode');
				}
			}];
		} else if(fl) {
			fn.splice(0,0,fl);
		}
		if(typeof opt === 'number') {
			options = opt;
		} else if(opt) {
			fn.splice(0,0,opt);
		}
		middleware = middleware.concat(...fn);
		// if(options&RouterOptions.SECURE) {
		// 	Router.register(this, [method],route, [async (ctx:KaenContext)=>{
		// 		if(!ctx.isLogged) {
		// 			ctx.status = 401;
		// 		}
		// 	}]);
		// }
		Router.register(this, [method],route, middleware, options);
		return this;
    };
    return descriptor;
}
class Route {
    private method:HTTPVerbs
    private parts:Array<string>
    public route: RegExp
	private callback:Middleware
	public get isProtected() {
		return !!(this.options & RouterOptions.SECURE);
	}
    constructor(route:string, fn:Middleware, private options?: RouterOptions)
    {
        this.parts = route.split('/');
        let converted:any = this.parts.map(p=>{
            if(p.indexOf(':')>-1) {
                var myRegexp = /(:[A-Za-z][0-9a-zA-Z]+)/img;
                var match = myRegexp.exec(p);
                return p.replace(myRegexp, '([^\/\.]+)');
            } else {
                return p;
            }
        });
        converted = converted.join('/');
        this.route = new RegExp('^' +converted + '$', "igm");
        this.callback = fn;
    }
    match(url:string) {
        let matched = this.route.exec(url);
        this.route.lastIndex = 0;
        if(matched) {
            matched.shift();
        }
        return matched;
    }
    call() {
        return this.callback;
    }
}
export class Router {
	protected static middleware:Map<string,Map<HTTPVerbs, Array<Route>>> = new Map();
	protected subdomain:string;
    constructor(subdomain?:string) {
		this.subdomain=subdomain || process.env.KAEN_INTERNAL_SUBDOMAIN;
    }
    static register(router:Router, methods:HTTPVerbs[], route: string , stack_middleware:Middleware[], options?: RouterOptions ) {
		let subdomain_stack:Map<HTTPVerbs, Array<Route>>;
		if (!configuration.server.subdomains.includes(router.subdomain)) {
			configuration.server.subdomains.push(router.subdomain);
		}
		if ( !Router.middleware.has(router.subdomain) ) {
			Router.middleware.set(router.subdomain, new Map());
		}
		subdomain_stack = Router.middleware.get(router.subdomain);
		let method_stack;
        for(const method of methods) {
			if(!subdomain_stack.has(method)) {
				subdomain_stack.set(method, []);
			}
			method_stack = subdomain_stack.get(method);
			for(const middleware of stack_middleware) {
				const newroute = new Route(route, middleware, options);
				method_stack.push(newroute);
			}
        }
		drouter(`${grey('[')}${yellow(methods.join(', '))}${grey(']')}\t${cyan(router.subdomain)}.${grey(host)}${cyan(route)}`);
	}
	options(route:string, file:string):Router
	options(route:string, options:RouterOptions, file:string):Router
	options(route:string, options: RouterOptions, ...fn: Middleware[] ):Router
	options(route:string, ...fn: Middleware[] ):Router
	@RouterStackMethod options(){return this;}
	get(route:string, file:string):Router
	get(route:string, options:RouterOptions, file:string):Router
	get(route:string, options: RouterOptions, ...fn: Middleware[] ):Router
	get(route:string, ...fn: Middleware[] ):Router
	@RouterStackMethod get(){return this;}
	post(route:string, file:string):Router
	post(route:string, options:RouterOptions, file:string):Router
	post(route:string, options: RouterOptions, ...fn: Middleware[] ):Router
	post(route:string, ...fn: Middleware[] ):Router
	@RouterStackMethod post(){return this;}
	put(route:string, file:string):Router
	put(route:string, options:RouterOptions, file:string):Router
	put(route:string, options: RouterOptions, ...fn: Middleware[] ):Router
	put(route:string, ...fn: Middleware[] ):Router
	@RouterStackMethod put(){return this;}
	patch(route:string, file:string):Router
	patch(route:string, options:RouterOptions, file:string):Router
	patch(route:string, options: RouterOptions, ...fn: Middleware[] ):Router
	patch(route:string, ...fn: Middleware[] ):Router
	@RouterStackMethod patch(){return this;}
	delete(route:string, file:string):Router
	delete(route:string, options:RouterOptions, file:string):Router
	delete(route:string, options: RouterOptions, ...fn: Middleware[] ):Router
	delete(route:string, ...fn: Middleware[] ):Router
	@RouterStackMethod delete(){return this;}
    @RouterStackMethod ws(route:string, fn: middlewareWS | string, options?: RouterOptions ) {}
    all(...fn: Middleware[]):Router {
		let methods = Object.keys(HTTPVerbs).map(v=>HTTPVerbs[v]);
		Router.register(this, methods, '/.*', fn);
		return this;
	}
	/**
	 * Registers the method for GET, POST, PUT, PATH and DELETE verbs
	 * @param middleware
	 */
	common(route:string, ...middleware:Middleware[]):Router {
		Router.register(
			this,
			RESTVerbs,
			posix.join('/', route),
			middleware
		);
		return this;
	}
	static addMatchCondition (fn:(route:Route, ctx:KaenContext)=>boolean) {
		Router.matchConditions.push(fn);
	}
	static get subdomains () {
		return Array.from(Router.middleware.keys());
	}
	private static matchConditions = [];
    static async execute(context: KaenContext) {
		// let anytime = getTimeMSFloat();
		const middleware = Router.middleware.get(context.subdomain);
		if(!middleware)return;
		let routes = middleware.get(context.req.method as HTTPVerbs) || [];
		for(const route of routes){
			let match = route.match(context.url.path);
			// let auth = !route.isProtected || (route.isProtected && context.isLogged);
            if(match) {
				// context.status = 200;
				// context.state.time = getTimeMSFloat();
				let matchConditions = !Router.matchConditions.some(condition => !condition(route, context));
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
    async execute_ws (ws:any, message:string) {
        // let {event,data, url} = JSON.parse(message);
        // if(url)
        // for(const route of this.middleware.get('WS')) {
        //     let match = route.match(url.split('?')[0]);
        //     let context = {
        //         ws,
        //         params: {
        //             query: require('url').parse(url, true).query,
        //             body: data
        //         }
        //     }
        //     if(match) {
        //         //@ts-ignore
        //         await route.call()(context, ...match);
        //     }
        // }
    }
}
export interface WSContext {
    ws: any
    params: {
        query:string
        body:any
    }
}
export function Routes() {
	return Router.execute;
}

export function Subdomains () {
	return async function subdomains(ctx:KaenContext) {
		for (const subdomain of Router.subdomains) {
			if (ctx.domain.includes(`${subdomain}.`)) {
				ctx.domain = ctx.domain.replace(`${subdomain}.`, '');
				ctx.subdomain = subdomain;
				break;
			}
		}
	}
}