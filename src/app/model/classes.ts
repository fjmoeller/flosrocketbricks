export class File {
  link: string;
  name: string;
  description: string;
  type: string;
  allowViewer: boolean;
  allowExport: boolean;

  constructor(link: string, name: string, description: string, type: string, allowViewer: boolean, allowExport:boolean) {
    this.link = link;
    this.name = name;
    this.description = description;
    this.type = type;
    this.allowViewer = allowViewer;
    this.allowExport = allowExport;
  }
}

export class Version {
  version: string;
  versionExtra: string;
  changelog: string;
  files: File[];

  constructor(version: string, versionExtra: string, changelog: string, files: File[]) {
    this.version = version;
    this.versionExtra = versionExtra;
    this.changelog = changelog;
    this.files = files;
  }
}

export class FrontTag {
  tagId: string = "";
  tagName: string = "";
  selected: boolean = false;
}

export class Collection {
  id: number;
  name: string;
  description: string;
  cover: string;
  subCollections: SubCollection[];

  constructor(id: number, name: string, description: string,cover:string, subCollections: SubCollection[]) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.cover = cover;
    this.subCollections = subCollections;
  }
}

export class SubCollection {
  id: number;
  name: string;
  description: string;
  mocs: number[];

  constructor(id: number, name: string, description: string, mocs: number[]) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.mocs = mocs;
  }
}

export class Moc {
  id: number;
  internalColor: string;
  versions: Version[];
  title: string;
  pictures: string[];
  parts: number;
  updateMessage: string;
  dimensions: string;
  links: string[];
  scale: string;
  smallCoverImage: string;
  designer: string;
  stability: number;
  difficulty: number;
  lastupdate: string;
  fanPictures: string[];
  tags: string[];
  mocDescription: string;
  related: number[];
  altTitles: string[];
  region: string[];
  dateCreated: string;
  type: string;

  scaleExtra: string;
  partsExtra: string;
  dimensionsExtra: string;
  stabilityExtra: string;
  difficultyExtra: string;
  designerExtra: string;
  rocketDescription: string;
  internalColorExtra: string;
  company: string;
  companyExtra: string;
  regionExtra: string;
  typeExtra: string;

  constructor(altTitles:string[],internalColor: string, type: string, region: string[], id: number, versions: Version[], title: string, pictures: string[],
    parts: number, dimensions: string, scale: string, designer: string,
    stability: number, difficulty: number, lastupdate: string, tags: string[],
    mocDescription: string, related: number[], smallCoverImage: string, fanPictures: string[],
    dateCreated: string, scaleExtra: string, partsExtra: string, dimensionsExtra: string,
    stabilityExtra: string, difficultyExtra: string, designerExtra: string, internalColorExtra: string,
    company: string, updateMessage: string, links: string[], regionExtra: string, typeExtra: string, rocketDescription: string, companyExtra: string) {
    this.region = region;
    this.altTitles = altTitles;
    this.type = type;
    this.updateMessage = updateMessage;
    this.versions = versions;
    this.id = id;
    this.title = title;
    this.pictures = pictures;
    this.smallCoverImage = smallCoverImage;
    this.fanPictures = fanPictures;
    this.parts = parts;
    this.links = links;
    this.dimensions = dimensions;
    this.dateCreated = dateCreated;
    this.scale = scale;
    this.designer = designer;
    this.stability = stability;
    this.difficulty = difficulty;
    this.lastupdate = lastupdate;
    this.tags = tags;
    this.mocDescription = mocDescription;
    this.related = related;
    this.internalColor = internalColor;
    this.rocketDescription = rocketDescription;

    this.scaleExtra = scaleExtra;
    this.partsExtra = partsExtra;
    this.dimensionsExtra = dimensionsExtra;
    this.stabilityExtra = stabilityExtra;
    this.difficultyExtra = difficultyExtra;
    this.designerExtra = designerExtra;
    this.internalColorExtra = internalColorExtra;
    this.company = company;
    this.regionExtra = regionExtra;
    this.typeExtra = typeExtra;
    this.companyExtra = companyExtra;
  }
}