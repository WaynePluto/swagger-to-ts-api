import path from "path";
import fs from "fs";

/**
 * 描述注释
 * @param desc
 * @returns
 */
export function createDescCode(desc: string) {
  return typeof desc === "string" && desc ? `/** ${desc} */\n` : "";
}

/**
 * 首字母大写
 * @param str
 * @returns
 */
export function upperCaseFirstLetter(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** 下划线转帕斯卡 */
export function toPascalCase(str) {
  const parts = str.split("_");
  // 将每个部分的首字母大写
  const capitalizedParts = parts.map(part => part.charAt(0).toUpperCase() + part.slice(1));
  return capitalizedParts.join("");
}

export function writeToFile(content: string, filePath: string) {
  const dirPath = path.dirname(filePath);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  fs.writeFileSync(filePath, content);
}
