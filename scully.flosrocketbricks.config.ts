import { ScullyConfig } from '@scullyio/scully';
import { firestorePlugin } from './scully/plugins/plugin';
/** this loads the default render plugin, remove when switching to something else. */
import '@scullyio/scully-plugin-puppeteer'

export const config: ScullyConfig = {
  projectRoot: "./src",
  projectName: "flosrocketbricks",
  // add spsModulePath when using de Scully Platform Server,
  outDir: './dist/static',
  routes: {
    '/mocs/:id': {
      type: firestorePlugin
    }
  }
}