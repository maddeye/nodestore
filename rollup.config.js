import typescript from "@rollup/plugin-typescript";
import sucrase from "@rollup/plugin-sucrase";

const is_publish = !!process.env.PUBLISH;

const ts_plugin = is_publish
	? typescript({
			include: "src/**",
			typescript: require("typescript"),
	  })
	: sucrase({
			transforms: ["typescript"],
	  });

const external = (id) => id.startsWith("nodestore/");

export default [
	{
		input: `src/index.ts`,
		output: [
			{
				file: `index.mjs`,
				format: "esm",
				paths: (id) =>
					id.startsWith("nodestore/") &&
					`${id.replace("nodestore", ".")}index.mjs`,
			},
			{
				file: `index.js`,
				format: "cjs",
				paths: (id) =>
					id.startsWith("nodestore/") &&
					`${id.replace("nodestore", ".")}index.js`,
			},
		],
		external,
		plugins: [ts_plugin],
	},
];
