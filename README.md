# 📦 Simple PWA

## Example

```js
import createPWA from 'simple-pwa';
import express from 'express';

const pwa = await createPWA({
    // Creates an importmap. Set to 'bundle' to bundle into one file.
    method: 'importmap',

    // Entrypoint to be loaded
    entrypoint: 'ui/index.mjs',

    // Directories to serve
    staticDirs: ['assets'],

    // Base path. Defaults to CWD.
    basePath: pathToFileURL(process.cwd() + '/'),

    // Title of the Page
    title: 'My super PWA',

    // Charset. Defaults to 'utf-8'
    charset = 'utf-8',
});

const app = express();
app.use(pwa);
app.listen(8080);
```
