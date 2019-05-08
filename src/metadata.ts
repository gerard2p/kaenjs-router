import 'reflect-metadata';
import { HTTPVerbs } from '@kaenjs/core';
export const Router_Method_Metadata = Symbol('kaen:router');
export interface CORS {
    headers?:string[];
    credentials?:boolean;
    methods?:boolean;
    origin?:string;
}
export interface MethodMetadata {
  access_control_allow?: CORS
  // allowcredentials?: boolean;
  method?: HTTPVerbs;
  route?: string;
  // cors?:string;
  // cors_headers?:string[];
  ignore?:boolean;
}
export function getMetadata(target: any): MethodMetadata {
    return Reflect.getMetadata(Router_Method_Metadata, target) || {};
  }
  export function setMetadata(target: any, metadata: MethodMetadata) {
    let old = getMetadata(target);
    old.access_control_allow = Object.assign({}, old.access_control_allow || {}, metadata.access_control_allow || {});
    let new_settings = Object.assign({}, metadata, old);
    Reflect.defineMetadata(Router_Method_Metadata, new_settings, target);
  }