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
    '/moc/:id': {
      //type: firestorePlugin
      type: 'json',
      id:{
        url: 'http://localhost:4200/assets/mocs.json',
        property: 'id'
      }
    }
  }
}