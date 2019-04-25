import 'reflect-metadata';
import { HTTPVerbs } from '@kaenjs/core';
export interface MethodMetadata {
  access_control_allow?: {
    headers?:string[];
    credentials?:boolean;
    methods?:boolean;
    origin?:string;
  }
  // allowcredentials?: boolean;
  method?: HTTPVerbs;
  route?: string;
  // cors?:string;
  // cors_headers?:string[];
  ignore?:boolean;
}
export function getMetadata(target: any): MethodMetadata {
    return Reflect.getMetadata('kaen:router', target) || {};
  }
  export function setMetadata(target: any, metadata: MethodMetadata) {
    let old = getMetadata(target);
    old.access_control_allow = Object.assign({}, old.access_control_allow || {}, metadata.access_control_allow || {});
    let new_settings = Object.assign({}, metadata, old);
    Reflect.defineMetadata('kaen:router', new_settings, target);
  }