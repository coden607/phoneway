module.exports = {
  ci: {
    collect: {
      url: ["http://localhost:3000/", "http://localhost:3000/ar", "http://localhost:3000/stability", "http://localhost:3000/constitution", "http://localhost:3000/privacy"],
      numberOfRuns: 3,
    },
    assert: {
      preset: "lighthouse:recommended",
      assertions: {
        "categories:performance": ["error", { minScore: 0.8 }],
        "categories:accessibility": ["error", { minScore: 0.9 }],
        "categories:best-practices": ["error", { minScore: 0.9 }],
        "categories:seo": ["error", { minScore: 0.9 }],
        "errors-in-console": "warn",
        "heading-order": "warn",
        "label-content-name-mismatch": "warn",
        "legacy-javascript-insight": "warn",
        "network-dependency-tree-insight": "warn",
        "unused-css-rules": "warn",
        "unused-javascript": "off",
        "uses-responsive-images": "warn",
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
}
