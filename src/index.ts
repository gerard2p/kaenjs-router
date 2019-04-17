import { Router, RouterModel } from "./router";
import { RouterMiddleware } from "./middleware";
import { KaenContext, HTTPVerbs } from "@kaenjs/core";
import { RouteHooks } from "./internals";
import { RegisterHook, RegisterRoute } from "./register";
import { STORAGEHOOK, setMetadata } from "./decorator";
import { StandardResponseHeaders, StandardRequestHeaders } from "@kaenjs/core/headers";
import { posix } from "path";
export { RouterOptions } from "./internals";
export function Routes() {
	for(const hook of RouteHooks) {
		hook();
	}
	return RouterMiddleware;
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
export {Router, RouterModel};

RegisterHook(()=>{
	for(let hook of Array.from(STORAGEHOOK.keys()) ) {
		//@ts-ignore
		let m:RouterModel = new hook();
		const MainRouter = new Router(m.Subdomain);
		for(const method_name of RouterModel.getAllMethos(m) ) {
			const {method=HTTPVerbs.post, route=posix.join('/', method_name,m.addTrailingSlash?'/':'')}  = Reflect.getMetadata('kaen:router',m[method_name]) || {};
			setMetadata(m[method_name], {cors: m.CORS});
			RegisterRoute(m.Subdomain, [method], route, [m[method_name] as any], );
		}
	}
});
export {CORS, ROUTE, AllowCredentials, Register, AllowHeaders} from './decorator';