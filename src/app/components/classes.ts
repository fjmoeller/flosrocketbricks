import { NumberSymbol } from "@angular/common";

export class File {
  link: string;
  name: string;
  description: string;

  constructor(link: string, name: string, description: string) {
    this.link = link;
    this.name = name;
    this.description = description;
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
}

export class Moc {
  id: number;
  internalColor: string;
  versions: Version[];
  title: string;
  pictures: string[];
  parts: number;
  dimensions: string;
  scale: string;
  smallCoverImage: string;
  designer: string;
  stability: string;
  difficulty: string;
  lastupdate: string;
  fanPictures: string[];
  tags: string[];
  description: string;
  related: number[];
  region: string;
  dateCreated: string;
  type: string;

  scaleExtra: string;
  partsExtra: string;
  dimensionsExtra: string;
  stabilityExtra: string;
  difficultyExtra: string;
  designerExtra: string;
  internalColorExtra: string;
  company: string;
  companyExtra: string;
  regionExtra: string;
  typeExtra: string;

  constructor(internalColor: string, type: string, region: string, id: number, versions: Version[], title: string, pictures: string[],
    parts: NumberSymbol, dimensions: string, scale: string, designer: string,
    stability: string, difficulty: string, lastupdate: string, tags: string[],
    description: string, related: number[], smallCoverImage: string, fanPictures: string[], 
    dateCreated: string, scaleExtra: string, partsExtra: string, dimensionsExtra: string,
    stabilityExtra: string, difficultyExtra: string, designerExtra: string, internalColorExtra: string,
    company: string, regionExtra: string, typeExtra: string, companyExtra: string) {
    this.region = region;
    this.type = type;
    this.versions = versions;
    this.id = id;
    this.title = title;
    this.pictures = pictures;
    this.smallCoverImage = smallCoverImage;
    this.fanPictures = fanPictures;
    this.parts = parts;
    this.dimensions = dimensions;
    this.dateCreated = dateCreated;
    this.scale = scale;
    this.designer = designer;
    this.stability = stability;
    this.difficulty = difficulty;
    this.lastupdate = lastupdate;
    this.tags = tags;
    this.description = description;
    this.related = related;
    this.internalColor = internalColor;

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