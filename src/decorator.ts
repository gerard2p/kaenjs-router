import { HTTPVerbs } from '@kaenjs/core';
import 'reflect-metadata';
export interface MethodMetadata {
  allowcredentials?: boolean;
  method?: HTTPVerbs;
  route?: string;
  cors?:string;
  cors_headers?:string[];
}
export const RESTVerbs = [
  HTTPVerbs.get,
  HTTPVerbs.post,
  HTTPVerbs.put,
  HTTPVerbs.patch,
  HTTPVerbs.delete
];
export type DATABASEMODEL = { new (...args: any[]): {} };
export function getMetadata(target: any): MethodMetadata {
  return Reflect.getMetadata('kaen:router', target) || {};
}
export function setMetadata(target: any, metadata: MethodMetadata) {
  let old = getMetadata(target);
  let new_settings = Object.assign({}, metadata, old);
  Reflect.defineMetadata('kaen:router', new_settings, target);
}
export function ROUTE(method: HTTPVerbs = HTTPVerbs.post, route?: string) {
  return function(target: any, key: string, descriptor: PropertyDescriptor) {
    setMetadata(target[key], { method, route });
  };
}
export function AllowCredentials() {
  return function(target: any, key: string, descriptor: PropertyDescriptor) {
    setMetadata(target[key], { allowcredentials: true });
  };
}
type ClassDecorator = <T extends DATABASEMODEL>(constructor: T) =>  T;
type MethodDecorator = (target: any, key: string, descriptor: PropertyDescriptor) => void;
export const STORAGEHOOK = new Map<object, any>();
/**
 * Decorates a class or method
 * @param origin host names to include in CORS, values must be comma separeted; no spaces
 */
export function CORS(origin: string):MethodDecorator|any
 {
  return function(...args: any[]) {
    if (args.length == 1) {
        const [constructor] = args;
    //   return function CORS<T extends DATABASEMODEL>(constructor: T) {
        let model = class model extends constructor {
          CORS = origin;
        }
        if (STORAGEHOOK.has(constructor)) {
          STORAGEHOOK.delete(constructor);
        }
        STORAGEHOOK.set(model, 'cors');
        return model;
    //   };
    } else if(args.length === 3) {
        const [target, key] = args;
        setMetadata(target[key], {cors:origin});
    }
  };
}


export function Register(subdomain:string) {
	return function Register<T extends DATABASEMODEL>(constructor: T) {
		class model extends constructor {
			Subdomain = subdomain;
		};
		if ( STORAGEHOOK.has(constructor) ) {
			STORAGEHOOK.delete(constructor);
		}
		STORAGEHOOK.set(model, 'register');
		return model;
	}
}

export function AllowHeaders(headers:string[]) {
    return function(target: any, key: string, descriptor: PropertyDescriptor) {
      setMetadata(target[key], { cors_headers: headers});
    };
  }