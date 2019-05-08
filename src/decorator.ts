import { HTTPVerbs } from '@kaenjs/core';
import { setMetadata } from './metadata';
export const RESTVerbs = [
  HTTPVerbs.get,
  HTTPVerbs.post,
  HTTPVerbs.put,
  HTTPVerbs.patch,
  HTTPVerbs.delete
];
export type DATABASEMODEL = { new (...args: any[]): {} };

export function ROUTE(method: HTTPVerbs = HTTPVerbs.post, route?: string) {
  return function(target: any, key: string, descriptor: PropertyDescriptor) {
    setMetadata(target[key], { method, route });
  };
}
export function AllowCredentials() {
  return function(target: any, key: string, descriptor: PropertyDescriptor) {
    setMetadata(target[key], { access_control_allow:{credentials: true }});
  };
}
type ClassDecoratorFunction = (constructor:any)=>any
type MethodDecoratorFunction = (target:any,key:string)=>any
type ClassDecorator = <T extends DATABASEMODEL>(constructor: T) =>  { new (...args: any[]): any; prototype: any; } & T;
type MethodDecorator = (target: any, key: string, descriptor: PropertyDescriptor) => void;
function decorateClass(args:any[], fn:ClassDecoratorFunction):ClassDecorator {
  if(args.length===1)return fn(args[0])
  return null
}
function decorateMethod(args:any[], fn:MethodDecoratorFunction): MethodDecorator {
  if(args.length>=1)return fn(args[0], args[1]);
  return null
}
function decorate(args:any[], fn1:ClassDecoratorFunction, fn2:MethodDecoratorFunction) {
  return decorateClass(args, fn1) || decorateMethod(args, fn2);
}
export const STORAGEHOOK = new Map<object, any>();
/**
 * Decorates a class or method
 * @param origin host names to include in CORS, values must be comma separeted; no spaces
 */
export function CORS(origin: string) : any
{
  return function(...args: any[]) {
    return decorate(args,  (constructor)=>{
      class model extends constructor {
        CORS = Object.assign({}, {origin}, this.CORS);
      }
      if (STORAGEHOOK.has(constructor)) {
        STORAGEHOOK.delete(constructor);
      }
      STORAGEHOOK.set(model, 'cors');
      return model;
    },(target, key)=>{
      setMetadata(target[key], {access_control_allow:{
        origin,
        methods:true
      }});
    });
  }
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

export function AllowHeaders(headers:string[]) : any {
    return function(...args: any[]) {
      return decorate(args,  (constructor)=>{
        class model extends constructor {
          CORS = Object.assign({}, {headers}, this.CORS);
        }
        if (STORAGEHOOK.has(constructor)) {
          STORAGEHOOK.delete(constructor);
        }
        STORAGEHOOK.set(model, 'cors');
        return model;
      },(target, key)=>{
        setMetadata(target[key], { access_control_allow: {headers}});
      });
    }
  }
export function Ignore(target: any, key: string, descriptor: PropertyDescriptor) {
  setMetadata(target[key], { ignore:true});
};
