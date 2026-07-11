/**
 * pnpm hook: inject TypeScript 5.x as a direct dependency for @typescript-eslint
 * and vue-tsc packages, so their require("typescript") resolves to TS5 rather
 * than TypeScript 7 (which removed the old compiler API).
 *
 * TypeScript 7 changed its package structure - require("typescript") now returns
 * only version info, not the full compiler API. This hook ensures tooling packages
 * that depend on the old API get TypeScript 5 at runtime.
 */

const TOOLING_PACKAGES = new Set([
	"@typescript-eslint/typescript-estree",
	"@typescript-eslint/parser",
	"@typescript-eslint/eslint-plugin",
	"@typescript-eslint/project-service",
	"@typescript-eslint/tsconfig-utils",
	"@typescript-eslint/type-utils",
	"@typescript-eslint/utils",
	"typescript-eslint",
	"vue-tsc",
]);

function readPackage(pkg) {
	if (TOOLING_PACKAGES.has(pkg.name)) {
		// Add TypeScript 5 as a direct dependency so require("typescript")
		// resolves to the TS5 compiler API, not the TS7 stub.
		pkg.dependencies = pkg.dependencies || {};
		pkg.dependencies["typescript"] = "~7.0.2";
		// Remove from peerDependencies to avoid version conflict warnings
		if (pkg.peerDependencies) {
			delete pkg.peerDependencies["typescript"];
		}
		if (pkg.peerDependenciesMeta) {
			delete pkg.peerDependenciesMeta["typescript"];
		}
	}
	return pkg;
}

module.exports = {
	hooks: {
		readPackage,
	},
};
