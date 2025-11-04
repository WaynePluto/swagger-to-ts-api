// Swagger 2.0 类型定义（精简版，仅供生成使用）
export interface SchemaMeta {
  description?: string;
  format?: string;
  enum?: (string | number)[];
}

export interface Schema extends SchemaMeta {
  type?: string; // object | array | string | integer | number | boolean
  $ref?: string;
  allOf?: Schema[];
  anyOf?: Schema[]; // 兼容已有代码
  properties?: Record<string, Schema>;
  items?: Schema;
  required?: string[];
  additionalProperties?: boolean | Schema;
}

export interface Parameter {
  name: string;
  in: "query" | "path" | "body" | "header" | "formData";
  description?: string;
  required?: boolean;
  schema?: Schema;
  type?: string;
  enum?: (string | number)[];
}

export interface ResponseObject {
  description?: string;
  schema?: Schema;
}

export interface ResponsesMap {
  [status: string]: ResponseObject;
}

export interface Method {
  summary?: string;
  tags?: string[];
  description?: string;
  parameters?: Parameter[];
  responses: ResponsesMap;
}

export type PathKeys = "post" | "get" | "put" | "delete" | "patch";

export interface PathObject {
  [method: string]: Method;
}

export interface SwaggerDocV2 {
  swagger: string;
  host?: string;
  basePath?: string;
  schemes?: string[];
  paths: Record<string, PathObject>;
  definitions?: Record<string, Schema>;
}
