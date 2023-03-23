import { registerPlugin } from "@scullyio/scully";
//import { collection, getDocs, getFirestore} from "@angular/fire/firestore";
export const firestorePlugin = "firestorePlugin";

/*const fsCollection = collection(getFirestore(), 'mocs')

async function firestoreRoutes(route: any, config: any) {
  let mocs = [];
  let mocsCol = await getDocs(fsCollection);
  mocsCol.forEach((moc) => {
    mocs.push({ route: `/mocs/${moc.id}` });
  });
  return mocs;
}*/

async function firestoreRoutes(route: any, config: any) {
  let mocs = [];
  for(let mocid=0;mocid<=18;mocid++){
    mocs.push({ route: `/moc/${mocid}` });
  }
  return mocs;
}

const validator = async () => [];

//registerPlugin('router',firestorePlugin,firestoreRoutes,validator);