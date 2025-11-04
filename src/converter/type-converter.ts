import { Schema } from "../swagger/types";
import { createDescCode } from "../utils";

/**
 * 将scheme转换为一个ts类型对象
 */
export function translateJSONSchemeToType(
  key: string,
  param: Schema | undefined,
  definitions: { [k: string]: Schema } | undefined,
  desc = "",
): string {
  if (!param) return key ? `${key}:unknown` : "unknown";

  // $ref 引用
  if (param.$ref) {
    const refName = param.$ref.replace("#/definitions/", "");
    if (definitions && definitions[refName]) {
      // 递归解析 ref
      return translateJSONSchemeToType(key, definitions[refName], definitions, desc);
    }
    return key ? `${createDescCode(desc)}${key}:${refName}` : refName;
  }

  // allOf 合并（intersection）
  if (param.allOf && param.allOf.length > 0) {
    const merged = param.allOf.map(s => translateJSONSchemeToType("", s, definitions)).join(" & ");
    return key ? `${createDescCode(desc)}${key}:(${merged})` : `(${merged})`;
  }

  // anyOf 维持已有逻辑 -> 联合类型
  if (param.anyOf && param.anyOf.length > 0) {
    const union = param.anyOf.map(s => translateJSONSchemeToType("", s, definitions)).join("|");
    return key ? `${createDescCode(desc)}${key}:(${union})` : `(${union})`;
  }

  // enum 处理
  if (param.enum && param.enum.length > 0) {
    const enumLiteral = param.enum.map(v => (typeof v === "number" ? v : `'${v}'`)).join("|");
    return key ? `${createDescCode(desc)}${key}:${enumLiteral}` : enumLiteral;
  }

  const type = param.type || inferType(param);
  if (type && typeof (translateMap as any)[type] === "function") {
    return (translateMap as any)[type](key, param, definitions, desc, param.required || []);
  }

  // 处理 additionalProperties 对象（动态键）
  if (typeof param.additionalProperties === "object") {
    const apType = translateJSONSchemeToType("", param.additionalProperties as Schema, definitions);
    const value = `{[k:string]:${apType}}`;
    return key ? `${createDescCode(desc)}${key}:${value}` : value;
  }

  // 空对象或无类型
  if (type === "object" || !type) {
    return key ? `${createDescCode(desc)}${key}:unknown` : "unknown";
  }
  return key ? `${createDescCode(desc)}${key}:unknown` : "unknown";
}

function inferType(param: Schema): string {
  if (param.properties) return "object";
  if (param.items) return "array";
  return "unknown";
}

const translateMap = {
  object: (
    key: string,
    param: Schema,
    definitions: { [k: string]: Schema } | undefined,
    desc: string,
    required: string[] = [],
  ) => {
    let value = "";
    const props = param.properties || {};
    for (const childKey in props) {
      const el = props[childKey];
      const isRequired = required.includes(childKey);
      const translated = translateJSONSchemeToType(
        childKey + (isRequired ? "" : "?"),
        el,
        definitions,
        el.description || "",
      );
      value += "\n" + translated;
    }
    if (typeof param.additionalProperties === "object") {
      const apType = translateJSONSchemeToType("", param.additionalProperties as Schema, definitions);
      value += `\n[key:string]:${apType}`;
    }
    value = value ? `{${value}\n}` : "unknown";
    return key ? `${createDescCode(desc)}${key}:${value}` : value;
  },
  array: (
    key: string,
    param: Schema,
    definitions: { [k: string]: Schema } | undefined,
    desc: string,
    required: string[] = [],
  ) => {
    if (param.items) {
      const value = translateJSONSchemeToType("", param.items, definitions, "");
      return key ? `${createDescCode(desc)}${key}:${value}[]` : `${value}[]`;
    }
    return key ? `${createDescCode(desc)}${key}:unknown[]` : `unknown[]`;
  },
  string: (key: string, param: Schema, desc: string) => {
    return key ? `${createDescCode(desc)}${key}:string` : "string";
  },
  boolean: (key: string, param: Schema, desc: string, required: string[] = []) => {
    return key ? `${createDescCode(desc)}${key}:boolean` : "boolean";
  },
  integer: (key: string, param: Schema, desc: string, required: string[] = []) => {
    return key ? `${createDescCode(desc)}${key}:number` : "number";
  },
  number: (key: string, param: Schema, desc: string, required: string[] = []) => {
    return key ? `${createDescCode(desc)}${key}:number` : "number";
  },
  "null": (key: string, param: Schema, desc: string, required: string[] = []) => {
    return key ? `${createDescCode(desc)}${key}:null` : "null";
  },
  "undefined": (key: string, param: Schema, desc: string, required: string[] = []) => {
    return key ? `${createDescCode(desc)}${key}:unknown` : "unknown";
  },
  "string,number": (key: string, param: Schema, desc: string, required: string[] = []) => {
    return key ? `${createDescCode(desc)}${key}:string|number` : "string|number";
  },
};
