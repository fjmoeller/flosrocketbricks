import { Injectable } from '@angular/core';
import { Group, Matrix4, Vector3 } from 'three';
import * as zip from "@zip.js/zip.js";
import { LdrPart, LdrSubmodel, PartReference } from '../model/ldrawParts';
import { IoFileService } from './io-file.service';

@Injectable({
  providedIn: 'root'
})
export class FileExportService {

  private backendFetchUrl: string = "https://wandering-breeze-a826.flomodoyt1960.workers.dev/viewer/?apiurl=";

  private countedPartMap: Map<PartReference, number> = new Map<PartReference, number>();

  constructor(private ioFileService: IoFileService) { }

  async getXml(url: string): Promise<String> {

    const partAmountMap: Map<PartReference, number> = await this.getPartCount(url);
    //TODO create XML out of it

    return "not implemented";
  }

  async getBricklink(url: string): Promise<String> {
    return "not implemented";
  }

  async getPartCount(url: string): Promise<Map<PartReference, number>> {
    console.log("Fetching MOC:", this.backendFetchUrl + url);
    const content = await fetch(this.backendFetchUrl + url);
    const ldrFile = await this.extractLdrFile(content);

    const ldrEntities = ldrFile.split("0 NOSUBMODEL"); //0 = submodels, 1 = parts

    if (ldrEntities.length != 2) {
      console.log("Error: file is formated wrong, no submodel divider found");
      return new Map<PartReference, number>;
    }

    const submodels = this.parseSubmodels(ldrEntities[0].split("0 NOFILE"));
    const firstSubmodel = submodels.topLdrSubmodel;
    const allSubmodels = submodels.submodelMap;
    const allPartsMap = this.parseParts(ldrEntities[1].split("0 NOFILE"));

    this.countedPartMap.clear();
    //map with parts to amount
    //return this.countParts(firstSubmodel, allSubmodels, allPartsMap);

    return new Map<PartReference, number>;
  
  }

  countParts(currentSubmodel: LdrSubmodel, allSubmodels: Map<string, LdrSubmodel>, allPartsMap: Map<string, LdrPart>) {

    currentSubmodel.references.forEach(
      reference => {

        const referencedPart = allPartsMap.get(reference.name);
        const referencedSubmodel = allSubmodels.get(reference.name);

        if (referencedPart) {//if is part
          
        }
        else if (referencedSubmodel)//if is submodel
          this.countParts(referencedSubmodel, allSubmodels, allPartsMap);
        else {
          console.log("Part not found: " + reference.name);
        }

        //this.countParts(...,+1,...,...)
      }
    );
  }

  async extractLdrFile(file: any): Promise<string> {
    try {
      const blob = await file.blob();
      const options = { password: "soho0909", filenameEncoding: "utf-8" };
      const entries = await (new zip.ZipReader(new zip.BlobReader(blob), options)).getEntries();
      const model = entries.find(e => e.filename === "model.ldr");
      if (model) {
        const decompressedBlob = await model.getData(new zip.BlobWriter());
        return decompressedBlob.text();
      }
      return "";
    } catch (e) {
      console.log(e);
      return "";
    }
  }

  private parseSubmodels(submodels: string[]) {
    console.log("Now parsing submodels!");
    const ldrSubModelMap = new Map<string, LdrSubmodel>();
    let topSubmodelSet: boolean = false;
    let topLdrSubmodel: LdrSubmodel = new LdrSubmodel("", []);
    //for each submodel inside the ldr file
    submodels.forEach(submodel => {
      const submodelLines = submodel.split("\n");

      let partName: string = "no name";
      const references: PartReference[] = [];
      //iterate all lines of a ldr submodel and parse them
      submodelLines.forEach(submodelLine => {
        if (submodelLine.endsWith("\r"))
          submodelLine = submodelLine.slice(0, submodelLine.lastIndexOf("\r"));
        if (submodelLine.startsWith("1"))
          references.push(this.parseLineTypeOne(submodelLine));
        else if (submodelLine.startsWith("0 FILE"))
          partName = submodelLine.slice(7).toLowerCase();
        else if (submodelLine.startsWith("0 Name:") && partName == "no name") //backup in case no name got set which can happen
          partName = submodelLine.slice(9).toLowerCase();
      });
      const ldrSubmodel = new LdrSubmodel(partName, references);

      if (!topSubmodelSet) { topLdrSubmodel = ldrSubmodel; topSubmodelSet = true; }

      ldrSubModelMap.set(partName, ldrSubmodel);
    });

    return { "submodelMap": ldrSubModelMap, "topLdrSubmodel": topLdrSubmodel };
  }

  private parseParts(parts: string[]): Map<string, LdrPart> {
    let allPartsMap: Map<string, LdrPart> = new Map<string, LdrPart>();
    console.log("Now parsing parts!");
    parts.forEach(partLines => {
      const parsedPart: LdrPart = this.parsePartLines(partLines);
      allPartsMap.set(parsedPart.name, parsedPart);
    });

    return allPartsMap;
  }

  private parsePartLines(partText: string): LdrPart {
    const partLines = partText.split("\n");

    let partName: string = "ERROR FLO";
    const references: PartReference[] = [];

    //Go through all lines of text and parse them
    partLines.forEach(partLine => {
      if (partLine.endsWith("\r")) //removes annoying stuff
        partLine = partLine.slice(0, partLine.lastIndexOf("\r"));
      if (partLine.startsWith("1")) { //line is a reference
        references.push(this.parseLineTypeOne(partLine));
      }
      else if (partLine.startsWith("0 FILE")) { //line is a part name
        partName = partLine.slice(7);
      }
    });

    return new LdrPart(partName, new Map<number, Vector3[]>, new Map<number, number[]>, new Map<number, Vector3[]>, references);
  }

  private parseLineTypeOne(line: string): PartReference {
    const splittedLine = this.ioFileService.splitter(line, " ", 14);
    return new PartReference(splittedLine[splittedLine.length - 1], new Matrix4(), parseInt(splittedLine[1]), false);
  }

  getCsv() {

  }


}
