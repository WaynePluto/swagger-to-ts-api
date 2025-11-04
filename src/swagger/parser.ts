// swagger.json 解析相关
import { SwaggerDocV2 } from "./types";

export function parseSwagger(doc: SwaggerDocV2) {
  // 可扩展：解析 swagger.json，返回结构化数据
  return {
    definitions: doc.definitions || {},
    paths: doc.paths || {},
  };
}
