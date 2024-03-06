import assert from 'node:assert';
import {URL, fileURLToPath, pathToFileURL} from 'node:url';
import {Generator} from '@jspm/generator';
import {Router} from 'express';
import serveStatic from 'serve-static';
import {rollup} from 'rollup';
import nodeResolve from '@rollup/plugin-node-resolve';
import compression from 'compression';

function createHTML ({title, charset, entrypoint, importMap}) {
	return `
		<!DOCTYPE html>
		<html>
			<head>
				<meta charset="${charset}">
				<title>${title}</title>
				${importMap ? `
					<script type="importmap">
						${importMap}
					</script>
				` : ''}
				<script type="module" src="${entrypoint}"></script>
			</head>
			<body>
				<noscript>This application relies on enabled JavaScript</noscript>
			</body>
		</html>
	`;
}

async function createImportMapBase ({entrypoint, basePath, title, charset}) {
	const generator = new Generator({
		defaultProvider: 'nodemodules',
		env: ['production', 'browser', 'module'],
		baseUrl: basePath
	});
	await generator.link(fileURLToPath(new URL(entrypoint, basePath)));
	const importMap = JSON.stringify(generator.getMap(), null, '  ');
	return createHTML({title, importMap, entrypoint, charset});
}

async function createBundledEntrypoint ({entrypoint, basePath}) {
	const bundler = await rollup({
		plugins: [nodeResolve()],
		input: fileURLToPath(new URL(entrypoint, basePath)),
	});

	const {output} = await bundler.generate({format: 'es'});
	assert(output.length === 1);
	return output[0].code;
}

export async function createPWA ({
	method = 'importmap',
	entrypoint = 'index.mjs',
	staticDirs = [''],
	basePath = pathToFileURL(process.cwd() + '/'),
	title = '',
	charset = 'utf-8',
} = {}) {
	const app = new Router();
	app.use(compression());

	assert(basePath instanceof URL);

	// Serve base file
	if (method === 'importmap') {
		// Implicitly add node_modules!
		staticDirs.push('node_modules');

		const baseFile = await createImportMapBase({entrypoint, basePath, title, charset});
		app.get('/', async (req, rsp) => {
			rsp.setHeader('content-type', `text/html; charset=${charset}`);
			rsp.send(baseFile);
		});
	} else if (method === 'bundle') {
		const baseFile = await createHTML({entrypoint, title, charset});
		app.get('/', async (req, rsp) => {
			rsp.setHeader('content-type', `text/html; charset=${charset}`);
			rsp.send(baseFile);
		});

		const entrypointFile = await createBundledEntrypoint({entrypoint, basePath});
		app.get(`/${entrypoint}`, (req, rsp) => {
			rsp.setHeader('content-type', `application/javascript; charset=${charset}`);
			rsp.send(entrypointFile);
		})
	} else {
		throw new Error(`Method ${method} not supported!`);
	}

	// Serve static dirs
	for (let dir of staticDirs) {
		const dirUrl = new URL(dir, basePath);
		const dirPath = fileURLToPath(dirUrl);
		app.use(`/${dir}`, serveStatic(dirPath));
	}

	return app;
}
