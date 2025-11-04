import axios from "axios";
import prettier from "prettier";
import { SwaggerDocV2 } from "./swagger/types";
import { parseSwagger } from "./swagger/parser";
import { generateApiGroups } from "./generator/api-generator";
import { writeToFile } from "./utils";

async function main() {
  const fileImport = `import axios from 'axios'\n`;
  // 获取 swagger.json
  const url = "http://localhost:8080/swagger/doc.json";
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
    writeToFile(formattedCode, `${group}Api.ts`);
  }
}

main();
