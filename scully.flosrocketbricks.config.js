"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
require("./scully/plugins/plugin");
/** this loads the default render plugin, remove when switching to something else. */
require("@scullyio/scully-plugin-puppeteer");
exports.config = {
    projectRoot: "./src",
    projectName: "flosrocketbricks",
    // add spsModulePath when using de Scully Platform Server,
    outDir: './dist/static',
    routes: {
        '/mocs/:id': {
            type: "fireStorePlugin"
        }
    }
};
