
# Critical CSS Import Webpack Plugin
Webpack plugin that simplifies **manual maintaining of critical CSS(s)**. Plugin gets critical `@import`s from given Sass/Less file and adds them as a separate entry. Critical `@import`s are flagged by [special comment](#comment-syntax).

 [Install](#install) / [Usage](#usage) / [Options](#options) / [Use case](#use-case)

## Install
```sh
npm install @vyvrhel/critical-css-import-webpack-plugin --save-dev
```
## Usage

Register plugin in webpack configuration with proper [options](#options) (set **source** file and one **critical id** at least):

**webpack.config.js**
```js
const CriticalCssImportPlugin = require('@vyvrhel/critical-css-import-webpack-plugin');

module.exports = {
  // ..
  plugins: [
    // ...
    new CriticalCssImportPlugin ({
      source: 'main.scss',
      criticals: [ 'home', 'blog', 'article' ], // list of critical ids
    }),
  ],
};
```
Flag critical `@import`s by adding [special comment](#comment-syntax) with critical CSS ids:

**main.scss**
```scss
@import 'tools/mixins'; // critical: all
@import 'components/molecules/articles'; // critical: blog, article
@import 'components/organisms/header'; // critical: all
@import 'components/organisms/footer';
@import 'components/pages/home'; // critical: home
@import 'components/pages/blog'; // critical: blog
// ...
```

### Comment syntax
 
 `"critical: " ( critical-id ( "," critical-id)* ) | "all"`
 
- Notation `critical:`  followed by comma-separated list of **critical ids**.
- For including `@import` in all critical CSS use keyword **all** instead of critical id.
- Comment format can be change by [pattern option](#pattern).

### Result
Now, depending on your webpack workflow, application should output files like **home.critical.css**, **blog.critical.css** and **article.critical.css**.

In other words, plugin simulates source files with flagged  `@import`s  and adds them as separate entries. In the words of webpack config, plugin basically does the following on background:
```js
module.exports = {
  // ...
  entry: {
    // ...
    'home.critical': /* main.scss only with imports flagged as 'home' or 'all' */,
    'blog.critical': /* main.scss only with imports flagged as 'blog or 'all' */,
    'article.critical': /* main.scss only with imports flagged as 'article or 'all' */,
  }
  // ...
};
```
Entry names for each critical id can be changed by [criticals options](#criticals).

## Options

####  `source` 
Type: `{String}` Required

Path to source Less/Sass file.  

####  `criticals`
Type: `{Array|Object|String}` Required

Array of critical CSS objects:
```js
[
  {
    id: 'critical-name-1',
    entry: 'critical-name-1.critical'
  },
  {
    id: 'critical-name-2',
    entry: 'critical-name-2.critical'
  },
]
```
- `id`  
Type: `{String}` Required  
The unique identifier for a critical CSS (used in CSS comment).

- `entry`  
Type: `{String}` Default:  `[id].critical`  
Webpack entry name.

Possible shortcuts:
```js
// string (one critical CSS with default entry name)
'critical-name'

// array of strings (more critical CSSs with default entry name)
[ 'critical-name-1', 'critical-name-2' ]

// object (one critical CSS)
{ id: 'critical-name' } // with default entry name
{ id: 'critical-name', entry : 'entry-name' }
```

####  `deleteJsOutput`
Type: `{Boolean}` Default: `true`

If enabled then  *.js* output file that is generated together with *.css* file by webpack will be deleted.

####  `pattern`
Type: `{Function}` Default: 
```js 
(criticalId) => new RegExp(`critical: ([a-zA-Z0-9\_\-]*, )*(all|${criticalId})(,|;|$)`, 'g')
```
Function returning regular expression used to filter out `@import`s from source file.

## Use Case

### Without plugin

We have one main Sass/Less file with many imports:

**main.scss**  
```scss
// common styles for whole project
@import 'settings/colors';
@import 'tools/mixins';
@import 'components/molecule/articles';
@import 'components/organism/header';
@import 'components/organism/footer';
@import 'components/page/home';
@import 'components/page/blog';
// ...
```
We also have *partially duplicated* file(s) that imports only critical styles:

**home.critical.scss**
```scss
// critical styles for homepage
@import 'tools/mixins';
@import 'components/organism/header';
@import 'components/page/home';
// ...
```
**blog.critical.scss**
```scss
// critical styles for blog page
@import 'tools/mixins';
@import 'components/molecule/articles';
@import 'components/organism/header';
@import 'components/page/blog';
// ...
```
**article.critical.scss**
```scss
// critical styles for article page
@import 'tools/mixins';
@import 'components/molecule/articles';
@import 'components/organism/header';
// ...
```
All processed by webpack:

**webpack.config.js**  
```js
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  entry: './main.scss',
  module: {
    rules: [
      {
        test: /\.scss$/i,
        use: [ MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader' ],
      },
    ],
  },
  plugins: [
    new MiniCssExtractPlugin(),
  ],
};
```

### With plugin
Maintaining these multiple files can be annoying, therefore plugin allows us to handle critical styles directly within main file:

**main.scss**  
```scss
// common styles for whole project
@import 'tools/mixins'; // critical: all
@import 'components/molecule/articles'; // critical: blog, article
@import 'components/organism/header'; // critical: all
@import 'components/organism/footer';
@import 'components/page/home'; // critical: home
@import 'components/page/blog'; // critical: blog
// ...
```

**webpack.config.js**  
```js
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CriticalCssImportPlugin = require('@vyvrhel/critical-css-import-webpack-plugin');

module.exports = {
  entry: './main.scss',
  module: {
    rules: [
      {
        test: /\.scss$/i,
        use: [ MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader' ],
      },
    ],
  },
  plugins: [
    new MiniCssExtractPlugin(),
    new CriticalCssImportPlugin ({
      source: './main.scss',
      criticals: [ 'home', 'blog', 'article' ],
    }),
  ],
};
```

Now, with correctly configured plugin, files *home.critical.scss*, *blog.critical.scss* and *article.critical.scss* are automaticaly simulated by webpack.

## Notes
Further optimization of generated critical CSS is recommended (e.g. by [removing *background-urls*](https://www.npmjs.com/package/postcss-bgimage)).
