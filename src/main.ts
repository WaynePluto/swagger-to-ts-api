import axios from "axios";
import prettier from "prettier";
import { SwaggerDocV2 } from "./swagger/types";
import { parseSwagger } from "./swagger/parser";
import { generateApiGroups } from "./generator/api-generator";
import { writeToFile } from "./utils";
import path from "path";

async function main() {
  const {
    dir_path = "../dist/",
    file_import_code = `import axios from 'axios'\n`,
    swagger_url = "http://localhost:8080/swagger/doc.json",
  } = process.env;
  /** 生成的文件目录 */
  const dirPath = path.join(__dirname, dir_path);
  /** 文件导入代码 */
  const fileImport = file_import_code;
  /** swagger 文档地址 */
  const url = swagger_url;
  const response = await axios.get<SwaggerDocV2>(url);
  const doc = response.data;

  // 解析 swagger
  const { definitions, paths } = parseSwagger(doc);

  // 生成接口分组代码
  const groupMap = generateApiGroups({ paths, definitions });

  // 输出到文件
  for (const [group, list] of Object.entries(groupMap)) {
    const content = list.join("\n");
    const code = `${fileImport}\n\n${content}`;
    const formattedCode = await prettier.format(code, { parser: "typescript" });
    const filePath = `${dirPath}${group}Api.ts`;
    writeToFile(formattedCode, filePath);
  }
}

main();
