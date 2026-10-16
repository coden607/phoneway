import nextCoreWebVitals from "eslint-config-next/core-web-vitals"
import nextTypeScript from "eslint-config-next/typescript"

const config = [
  { ignores: [".next/**", ".next-pwa-smoke/**", "next-env.d.ts", "node_modules/**", "playwright-report/**", "test-results/**"] },
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    rules: {
      "react/no-unescaped-entities": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]

export default config
