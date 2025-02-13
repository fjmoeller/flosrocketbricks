export interface File {
  link: string;
  name: string;
  description: string;
  type: string;
  export: boolean;
  viewer: string;
  instructions: string;

  dimensions: string;
  internalColor: string;
  stability: number;
  difficulty: number;
  parts: number;

  partsExtra: string;
  internalColorExtra: string;
  dimensionsExtra: string;
  stabilityExtra: string;
  difficultyExtra: string;
}

export interface Version {
  version: string;
  versionExtra: string;
  changelog: string;
  parts: number; //TODO
  files: File[];

  smallCoverImage: string;
  pictures: string[];
}

export interface FrontTag {
  tagId: string;
  tagName: string;
  selected: boolean;
}

export interface Collection {
  id: number;
  name: string;
  description: string;
  cover: string;
  subCollections: SubCollection[];
}

export interface SubCollection {
  id: number;
  name: string;
  description: string;
  mocs: number[];
}

export interface Moc {
  id: number;

  versions: Version[];
  title: string;

  updateMessage: string;
  links: string[];
  scale: string;
  designer: string;
  lastUpdate: string;
  fanPictures: string[];
  tags: string[];
  mocDescription: string;
  related: number[];
  altTitles: string[];
  region: string[];
  dateCreated: string;
  type: string;

  scaleExtra: string;
  designerExtra: string;
  rocketDescription: string;
  company: string;
  companyExtra: string;
  regionExtra: string;
  typeExtra: string;
}
