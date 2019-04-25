import { HTTPVerbs, KaenContext, Middleware } from "@kaenjs/core";
import { posix } from "path";
import { MiddlewareStack, RouterOptions, Route, MatchConditions, RouteHooks } from "./internals";
import { RegisterRoute } from "./register";
import { getMetadata, setMetadata } from "./metadata";
import 'reflect-metadata';

type middlewareWS = (context:WSContext, ...args:any[]) => void;

const RESTVerbs = [HTTPVerbs.get, HTTPVerbs.post, HTTPVerbs.put, HTTPVerbs.patch, HTTPVerbs.delete];

function RouterStackMethod(target:Router, key:string, descriptor:PropertyDescriptor) {
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
		// 	register(this.Subdomain, [method],route, [async (ctx:KaenContext)=>{
		// 		if(!ctx.isLogged) {
		// 			ctx.status = 401;
		// 		}
		// 	}]);
		// }
		RegisterRoute(this.Subdomain, [method],route, middleware, options);
		return this;
    };
    return descriptor;
}

export class Router {
	
    constructor(protected Subdomain?:string) {
		this.Subdomain=Subdomain || process.env.KAEN_INTERNAL_SUBDOMAIN;
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
		RegisterRoute(this.Subdomain, methods, '/.*', fn);
		return this;
	}
	/**
	 * Registers the method for GET, POST, PUT, PATH and DELETE verbs
	 * @param middleware
	 */
	common(route:string, ...middleware:Middleware[]):Router {
		RegisterRoute(
			this.Subdomain,
			RESTVerbs,
			posix.join('/', route),
			middleware
		);
		return this;
	}
	static get subdomains () {
		return Array.from(MiddlewareStack.keys());
	}
    static addMatchCondition(fn:(route:Route, ctx:KaenContext)=>boolean) {
        MatchConditions.push(fn);
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
// type FunctionPropertyNames<T> = { [K in keyof T]: T[K] extends Function ? Middleware : string|boolean }[keyof T];
type FunctionPropertyNames<T> = { [K in keyof T]: T[K] extends Function ? K : never }[keyof T];

type FunctionProperties<T> = Pick<T, FunctionPropertyNames<T>>;
/**
 * Use this class with decorator so you can create a Model like router
 */
export class RouterModel {
	Subdomain:string = 'www'
	CORS:string
	addTrailingSlash:boolean = true
	static setup(m:RouterModel) {
		for(const method_name of RouterModel.getAllMethos(m) ) {
			const {method=HTTPVerbs.post, route=posix.join('/', method_name,m.addTrailingSlash?'/':'')}  = Reflect.getMetadata('kaen:router',m[method_name]) || {};
			setMetadata(m[method_name], { access_control_allow:{origin: m.CORS}});
			RegisterRoute(m.Subdomain, [method], route, [m[method_name] as any],undefined, m );
		}
	}
    static getAllMethos(target:RouterModel) {
        let Methods:string[] = [];
        do{
			let nMethods = Object.getOwnPropertyNames(target).filter(p=>typeof target[p] === 'function').sort().filter(p=>{
				return p!=='constructor' && 
				Methods.indexOf(p)===-1 && 
				!getMetadata(target[p]).ignore;
			});
			Methods = Methods.concat(nMethods);
		}while((target = Object.getPrototypeOf(target)) && Object.getPrototypeOf(target));
        return Methods;
    }
}