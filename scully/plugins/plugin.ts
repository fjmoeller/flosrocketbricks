import { registerPlugin } from "@scullyio/scully";
import { collection, getDocs, getFirestore} from "@angular/fire/firestore";

const fsCollection = collection(getFirestore(), 'mocs')
export const firestorePlugin = "firestorePlugin";

async function firestoreRoutes(route: any, config: any) {
  let mocs = [];
  let mocsCol = await getDocs(fsCollection);
  mocsCol.forEach((moc) => {
    mocs.push({ route: `/mocs/${moc.id}` });
  });
  return mocs;
}

const validator = async () => [];

registerPlugin('router',firestorePlugin,firestoreRoutes,validator);