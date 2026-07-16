import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = defineConfig(
  ...nextCoreWebVitals,
  ...nextTypescript,
  globalIgnores(["node_modules/**", ".next/**", "data/**", "drizzle/**"])
);

export default eslintConfig;
