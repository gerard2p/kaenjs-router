import { KaenContext } from "@kaenjs/core";
import { STORAGEHOOK } from "./decorator";
import { RouteHooks } from "./internals";
import { RouterMiddleware } from "./middleware";
import { RegisterHook } from "./register";
import { Router, RouterModel } from "./router";
export * from './decorator';
export { AllowCredentials, AllowHeaders, CORS, Register, ROUTE } from './decorator';
export { RouterOptions } from "./internals";
export { Router, RouterModel };
export function Routes() {
	for(const hook of RouteHooks) {
		hook();
	}
	return RouterMiddleware;
}

export function Subdomains (def?:string) {
	return async function subdomains(ctx:KaenContext) {
		for (const subdomain of Router.subdomains) {
			if (ctx.domain.includes(`${subdomain}.`)) {
				ctx.domain = ctx.domain.replace(`${subdomain}.`, '');
				ctx.subdomain = subdomain || def;
				break;
			}
		}
		ctx.subdomain = ctx.subdomain || def;
	}
}

RegisterHook(()=>{
	for(let hook of Array.from(STORAGEHOOK.keys()) ) {
		//@ts-ignore
		let m:RouterModel = new hook();
		//@ts-ignore
		hook.setup(m);
	}
});
