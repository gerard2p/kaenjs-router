import { KaenContext, HTTPVerbs, Middleware } from "@kaenjs/core";
export enum RouterOptions {
    SECURE = 1 << 0,
    WS = 1 << 1,
    CORS = 1 << 2,
    CREDENTIALS = 1 << 3
}
export const MiddlewareStack:Map<string,Map<HTTPVerbs, Array<Route>>> = new Map();
export const MatchConditions:((r:Route, c:KaenContext)=>boolean)[] = [];
export const RouteHooks:(()=>void)[] = [];
export class Route {
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