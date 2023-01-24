import { NumberSymbol } from "@angular/common";

export class File {
  link: string;
  name: string;
  desc: string;

  constructor(link: string, name: string, desc: string) {
    this.link = link;
    this.name = name;
    this.desc = desc;
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

export class Moc {
  id: number;
  versions: Version[];
  title: string;
  pictures: string[];
  parts:number;
  dimensions: string;
  scale: string;
  designer: string;
  stability: string;
  difficulty: string;
  lastupdate: string;
  tags: string[];
  description: string;
  related: Moc[];

  constructor(id:number,versions: Version[],title: string, pictures: string[], 
    parts:NumberSymbol,dimensions:string,scale:string,designer:string,
    stability:string,difficulty:string,lastupdate:string,tags:string[],
    description:string,related:Moc[]) {
      this.versions = versions;
      this.id=id;
      this.title = title;
      this.pictures = pictures;
      this.parts = parts;
      this.dimensions = dimensions;
      this.scale = scale;
      this.designer = designer;
      this.stability = stability;
      this.difficulty = difficulty;
      this.lastupdate = lastupdate;
      this.tags = tags;
      this.description = description;
      this.related = related;
  }
}