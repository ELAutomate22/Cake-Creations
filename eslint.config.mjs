import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/**
 * eslint-config-next ships native flat configs, so they are spread in directly
 * rather than going through the FlatCompat shim.
 */
const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  {
    ignores: [".next/**", "node_modules/**", "scripts/**", "public/**"],
  },
];

export default eslintConfig;
