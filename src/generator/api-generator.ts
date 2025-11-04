// API 代码生成相关：负责将 swagger 的 paths + definitions 转换为类型与函数代码段
import { PathObject, Schema, Method, Parameter } from "../swagger/types";
import { translateJSONSchemeToType } from "../converter/type-converter";
import { toPascalCase, upperCaseFirstLetter } from "../utils";

// 输入与输出约定
// 输入：swagger 的 paths 与 definitions
// 输出：Record<string,string[]>  每个分组 (依据首级路径段) 对应一个包含类型与函数代码片段的 string 数组
export function generateApiGroups({
  paths,
  definitions,
}: {
  paths: Record<string, PathObject>;
  definitions?: Record<string, Schema>;
}): Record<string, string[]> {
  const groupMap: Record<string, string[]> = {};
  const getGroupKey = (p: string): string => p.split("/").filter(Boolean)[0] || "root";

  Object.keys(paths).forEach(urlPath => {
    const methods = paths[urlPath];
    Object.keys(methods).forEach(method => {
      const methodDef: Method | undefined = (methods as any)[method];
      if (!methodDef) return;
      const moduleName = methodDef.tags?.[0] || "default";
      const name = methodDef.description || methodDef.summary || urlPath;
      const params: Parameter[] = methodDef.parameters || [];
      const querys =
        params
          .filter(p => p.in === "query")
          .map(p => ({ name: p.name, description: p.description || "", required: p.required })) ?? [];
      const bodyParam = params.find(p => p.in === "body");
      const bodySchema = bodyParam?.schema;
      const responseSchema = methodDef.responses?.["200"]?.schema;

      const api = createApi({
        moduleName,
        name,
        url: urlPath,
        method,
        querys,
        bodySchema,
        res: responseSchema,
        definitions,
      });
      const groupKey = getGroupKey(urlPath);
      if (!groupMap[groupKey]) groupMap[groupKey] = [];
      groupMap[groupKey].push(api.type + api.functionStr);
    });
  });

  return groupMap;
}

type CreateApiParam = {
  moduleName: string;
  name: string;
  method: string;
  url: string;
  querys: { name: string; description: string; required?: boolean }[];
  bodySchema?: any;
  res?: any;
  definitions?: { [k: string]: any };
};

function createApi(param: CreateApiParam) {
  const { moduleName, method, url, querys, bodySchema, res, name, definitions } = param;
  const apiMethod = method.toLocaleLowerCase();
  const ApiMethod = upperCaseFirstLetter(apiMethod);
  const urlParamReg = /{([^}]*)}/g;
  const urlParams = url.match(urlParamReg)?.map(el => ({ reg: el, name: el.replace(/\{|\}/g, "") })) ?? [];
  const apiName = toPascalCase(
    url.replace("api", "").replace(/\//g, "_").replace(/-/g, "_").replace(/\./g, "_").replace(urlParamReg, "by_$1"),
  );
  const apiPathParams = urlParams.map(e => e.name)?.filter(e => !!e) ?? [];
  const apiPathTypeName = `${ApiMethod}${apiName}Path`;
  const apiPathTypeContent = "{\n" + apiPathParams.map(item => `${item}:string`).join(", \n") + "\n}\n";
  const pathTypeCode =
    apiPathParams.length > 0 ? `/** ${name}path参数 */\nexport type ${apiPathTypeName} = ${apiPathTypeContent}` : "";
  const apiPathParamsInFn = `{${apiPathParams.map(e => `${e}`).join(",")}}:${apiPathTypeName}`;
  const apiQuerys = querys?.filter(e => Boolean(e.name)) ?? [];
  const queryTypeName = `${ApiMethod}${apiName}Query`;
  const queryTypeContent =
    "{\n" +
    apiQuerys
      .map(item => {
        const desc = item.description ? `/** ${item.description} */` : "";
        const name = item.name;
        const type = item.required ? ":string" : "?:string";
        return `${desc}\n${name}${type}`;
      })
      .join(", \n") +
    "\n}\n";
  const queryTypeCode =
    apiQuerys.length > 0 ? `/** ${name}query参数 */\nexport type ${queryTypeName} = ${queryTypeContent}` : "";
  const bodyTypeName = `${ApiMethod}${apiName}Body`;
  let bodyTypeContent = "";
  let bodyTypeCode = "";
  if (bodySchema) {
    bodyTypeContent = translateJSONSchemeToType("", bodySchema, definitions);
    bodyTypeCode = bodyTypeContent ? `/** ${name}body参数 */\nexport type ${bodyTypeName} = ${bodyTypeContent}` : "";
  }
  const resTypeName = `${ApiMethod}${apiName}Res`;
  const resTypeContent = translateJSONSchemeToType("", res, definitions);
  const resTypeCode = resTypeContent
    ? `/** ${name}返回值类型 */\nexport type ${resTypeName} = ${resTypeContent}`
    : `/** ${name}返回值类型 */\nexport type ${resTypeName} = unknown`;
  const apiParamsArr: string[] = [];
  if (apiPathParams.length > 0) apiParamsArr.push(apiPathParamsInFn);
  if (apiQuerys.length > 0) apiParamsArr.push(`query:${queryTypeName}`);
  if (bodySchema && bodyTypeContent && bodyTypeContent.length > 0) apiParamsArr.push(`data:${bodyTypeName}`);
  const apiFnParamCode = apiParamsArr.join(",");
  let apiUrl = url;
  urlParams.forEach(param => {
    apiUrl = apiUrl.replace(param.reg, `$${param.reg}`);
  });
  const apiContent = {
    type: `${pathTypeCode}
    ${queryTypeCode}
    ${bodyTypeCode}
    ${resTypeCode}`,
    functionStr: `
    /**
     * ${name}
     * 所属模块：${moduleName} 
     */
    export async function ${apiMethod + apiName}(${apiFnParamCode}) {
      try {
        const res = await axios<${resTypeName}>({
          url: \`${apiUrl}\`,
          method: '${apiMethod}',
          ${apiQuerys.length > 0 ? "params: query," : ""}
          ${bodySchema && bodyTypeContent ? "data" : ""}
        })
        return res
      } catch (error) {
        return null
      }
    }`,
  };
  return apiContent;
}
