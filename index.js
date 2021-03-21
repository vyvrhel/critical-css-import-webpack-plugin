const path = require('path');
const fs = require('fs');
const { validate } = require('schema-utils');
const VirtualModulesPlugin = require('webpack-virtual-modules');

const PLUGIN_NAME = 'CriticalCssImportPlugin';

const schema = require('./schemas/CriticalCssImportPlugin.json');

class CriticalCssImportPlugin {
  constructor(options = {}) {
    // validate options
    validate(schema, options, {
      name: PLUGIN_NAME,
      baseDataPath: 'options',
    });

    // merge user options to default options
    this.options = {
      ...{
        source: null,
        criticals: [],
        pattern: (criticalId) => new RegExp(`critical: ([a-zA-Z0-9_-]*, )*(all|${criticalId})(,|;|$)`, 'g'),
        deleteJsOutput: true,
        encoding: 'utf8',
      },
      ...options,
    };

    // normalize options
    this.normalizeOptions();
  }

  normalizeOptions() {
    // convert criticals to array of objects
    // (another possible inputs are string, array of strings, object)
    if (this.options.criticals && !Array.isArray(this.options.criticals)) {
      this.options.criticals = [this.options.criticals];
    }
    this.options.criticals = this.options.criticals
      .map((v) => {
        if (typeof v === 'string') {
          return { id: v, entry: `${v}.critical` };
        }
        return { id: v.id, entry: v.entry || `${v.id}.critical` };
      });
  }

  apply(compiler) {
    // add virtual style entries with deleted uncritical imports
    const virtualModulesOptions = {};
    this.entries = {};
    this.options.criticals.forEach((critical) => {
      const src = this.options.source;
      const virtualSrc = `${path.dirname(src)}/~${critical.id}-critical${path.extname(src)}`;
      virtualModulesOptions[virtualSrc] = this.stripUncriticalImports(src, critical.id);
      this.entries[critical.entry] = compiler.webpack || false
        ? { import: [virtualSrc] } // webpack 5
        : virtualSrc; // webpack 4
    });
    if (typeof compiler.options.entry === 'string') {
      compiler.options.entry = { main: compiler.options.entry };
    }
    compiler.options.entry = { ...compiler.options.entry, ...this.entries };
    compiler.options.plugins.push(new VirtualModulesPlugin(virtualModulesOptions));

    // delete unwanted js output
    if (this.options.deleteJsOutput) {
      compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
        compilation.hooks.additionalAssets.tap(PLUGIN_NAME,
          () => this.deleteJsOutput(compilation, compiler));
      });
    }
  }

  stripUncriticalImports(src, criticalId) {
    return fs
      .readFileSync(src, this.options.encoding)
      .split(/\r?\n/)
      .filter((line) => (line.match(/^\s*@import/) ? line.match(this.options.pattern(criticalId)) : true))
      .join('\n');
  }

  deleteJsOutput(compilation, compiler) {
    compilation.chunks.forEach((chunk) => {
      if (Object.keys(this.entries).includes(chunk.name)) {
        chunk.files.forEach((filename) => {
          if (/\.js?(\?[^.]*)?$/.test(filename)) {
            if (compiler.webpack || false) { // webpack 5
              compilation.deleteAsset(filename);
              chunk.files.delete(filename);
            }
            delete compilation.assets[filename]; // webpack 4
          }
        });
      }
    });
  }
}

module.exports = CriticalCssImportPlugin;
