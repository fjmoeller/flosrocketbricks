import { Injectable } from '@angular/core';
import { Matrix4 } from 'three';
import * as zip from "@zip.js/zip.js";
import { PartReference } from '../../model/ldrawParts';
import { IoFileService } from './io-file.service';
import { LdrawColorService } from './ldraw-color.service';
import { SimpleLdrSubmodel, SimpleReference } from '../../model/simpleLdrawParts';
import { PartMapping, SpecificPartMapping, PartMappingFix } from 'src/app/model/partMappings';

@Injectable({
  providedIn: 'root'
})
export class FileExportService {

  private replaceColor: boolean = true;

  private separationString = "###";

  private backendFetchUrl = "https://worker.flosrocketbackend.com/viewer/?apiurl=";

  private countedPartMap = new Map<string, number>();
  private mappedCountedPartMap = new Map<string, number>();
  private usedParts = new Set<string>();

  private partMappings = new Map<string, { r: string, b: string }>();

  constructor(private ioFileService: IoFileService, private ldrawColorService: LdrawColorService) { }

  async collectUsedPartsMappings(url: string): Promise<void> {

    const fetchResult = await fetch(this.backendFetchUrl + url + "_pm.json");
    let mocSpecificMappedParts: SpecificPartMapping[] = [];
    if (fetchResult.status != 404)
      mocSpecificMappedParts = (await fetchResult.json()) as SpecificPartMapping[];

    const partList: PartMapping[] = await (await fetch("/assets/ldr/lists/partList.json")).json() as PartMapping[];
    const partListFix: PartMappingFix[] = await (await fetch("/assets/ldr/lists/partListFix.json")).json() as PartMappingFix[];

    this.partMappings.clear();
    for (let partId of this.usedParts) {

      const specificmappedPart = mocSpecificMappedParts.find(printMapping => printMapping.l == partId);
      if (specificmappedPart != undefined) {
        this.partMappings.set(partId, { r: specificmappedPart.r, b: specificmappedPart.b });
        continue;
      }

      const mappedPartFix = partListFix.find(part => part.io == partId);
      if (mappedPartFix != undefined) {
        this.partMappings.set(partId, { r: mappedPartFix.r, b: mappedPartFix.b });
        continue;
      }

      const mappedPart = partList.find(part => part.b.length > 0 && part.r !== "" && part.l.includes(partId));
      if (mappedPart != undefined) {
        if (mappedPart.b.length > 1) console.warn("Error: " + partId + " has multiple mappings, check the python validation script!");
        else this.partMappings.set(partId, { r: mappedPart.r, b: mappedPart.b[0] });
        continue;
      }

      console.error("Error: " + partId + " has found no mapping");
    }
  }

  mapParts(isBr: boolean): void {
    for (let countedPart of this.countedPartMap.keys()) {
      const colorIdKey = countedPart.split(this.separationString); //1sr part contains color, 2nd the id

      const mapping = this.partMappings.get(colorIdKey[1]);
      if (!mapping) { console.error("No mapping found for part" + countedPart); continue; }
      this.mappedCountedPartMap.set(
        colorIdKey[0] + this.separationString + (isBr ? mapping.b : mapping.r),
        (this.mappedCountedPartMap.get(countedPart) ?? 0) + (this.countedPartMap.get(countedPart) ?? 0)
      );
    }
  }

  async getXml(url: string, placeholderColor: string): Promise<string> {
    this.countedPartMap.clear();
    this.mappedCountedPartMap.clear();
    await this.collectParts(url);
    await this.collectUsedPartsMappings(url);
    this.mapParts(true);

    const placeHolderColorcode = this.ldrawColorService.getPlaceholderColorCode(placeholderColor);

    let xml = "<INVENTORY>\n";
    for (let key of this.mappedCountedPartMap.keys()) {
      const colorIdKey = key.split(this.separationString); //1sr part contains color, 2nd the id
      let color = "0";
      if (!this.replaceColor || placeHolderColorcode != Number(colorIdKey[0])) //if the color is not the to be replaced one
        color = "" + this.ldrawColorService.getBricklinkColorOf(colorIdKey[0], 0);


      xml += "	<ITEM>\n		<ITEMTYPE>P</ITEMTYPE>\n		<ITEMID>" + colorIdKey[1] + "</ITEMID>\n		<COLOR>" + color + "</COLOR>\n		<MINQTY>" + this.countedPartMap.get(key) + "</MINQTY>\n	</ITEM>";
    }
    xml += "</INVENTORY>";

    this.countedPartMap.clear();
    this.usedParts.clear();
    this.partMappings.clear();
    this.mappedCountedPartMap.clear();
    return xml;
  }

  async getCsv(url: string, colorName: string): Promise<string> {
    this.countedPartMap.clear();
    this.mappedCountedPartMap.clear();
    await this.collectParts(url);
    await this.collectUsedPartsMappings(url);
    this.mapParts(false);

    const placeHolderColorcode = this.ldrawColorService.getPlaceholderColorCode(colorName);

    let csv = "Part,Color,Quantity,Is Spare\n";
    for (let key of this.mappedCountedPartMap.keys()) {
      const colorIdKey = key.split(this.separationString);
      let color = "9999";
      if (!this.replaceColor || placeHolderColorcode != Number(colorIdKey[0])) { //if the color is not the to be replaced one
        color = "" + this.ldrawColorService.getRebrickableColorOf(colorIdKey[0], 9999);
      }

      csv += colorIdKey[1] + "," + color + "," + this.countedPartMap.get(key) + ",False\n";
    }

    this.countedPartMap.clear();
    this.mappedCountedPartMap.clear();
    this.usedParts.clear();
    this.partMappings.clear();
    return csv;
  }

  private async collectParts(url: string): Promise<void> {
    const content = await fetch(this.backendFetchUrl + url);
    const ldrFile = await this.extractLdrFile(content);

    //go through all things => collect submodels and parts

    const submodels = this.parseSubmodels(ldrFile.split("0 NOFILE"));
    const firstSubmodel = submodels.topLdrSubmodel;
    const allSubmodels = submodels.submodelMap;

    this.countParts(firstSubmodel, allSubmodels);
  }

  private countParts(currentSubmodel: SimpleLdrSubmodel, allSubmodels: Map<string, SimpleLdrSubmodel>) {
    currentSubmodel.references.forEach(
      reference => {
        const referencedSubmodel = allSubmodels.get(reference.name);
        if (referencedSubmodel)//if is submodel
          this.countParts(referencedSubmodel, allSubmodels);
        else { //if is part
          const id = reference.color + this.separationString + reference.name;
          this.countedPartMap.set(id, (this.countedPartMap.get(id) ?? 0) + 1);
          this.usedParts.add(reference.name);
        }
      }
    );
  }

  private async extractLdrFile(file: any): Promise<string> {
    try {
      const blob = await file.blob();
      const options = { password: "soho0909", filenameEncoding: "utf-8" };
      const entries = await (new zip.ZipReader(new zip.BlobReader(blob), options)).getEntries();
      const model = entries.find(e => e.filename == "model.ldr");
      if (model == undefined)
        return "";
      if (model && model.getData) {
        const blob = await model.getData(new zip.BlobWriter());
        return await blob.text();
      }
    } catch (e) {
      console.error("Error extracting ldr from io file!");
      console.error(e);
    }
    return "";
  }

  private parseSubmodels(submodels: string[]) {
    const ldrSubModelMap = new Map<string, SimpleLdrSubmodel>();
    let topSubmodelSet: boolean = false;
    let topLdrSubmodel: SimpleLdrSubmodel = new SimpleLdrSubmodel("", []);
    //for each submodel inside the ldr file
    for (let submodel of submodels) {
      const submodelLines = submodel.split("\n");

      let submodelName: string = "no name";
      const references: SimpleReference[] = [];
      let isCustomPart = false;
      for (let submodelLine of submodelLines) { //iterate all lines of a ldr submodel and parse them
        if (submodelLine.endsWith("\r"))
          submodelLine = submodelLine.slice(0, submodelLine.lastIndexOf("\r"));
        if (submodelLine.startsWith("1"))
          references.push(this.parseLineTypeOne(submodelLine));
        else if (submodelLine.startsWith("0 FILE")) {
          if (submodelLine.includes(".dat")) {
            isCustomPart = true;
            break;
          }
          else
            submodelName = submodelLine.slice(7).toLowerCase();
        }
        else if (submodelLine.startsWith("0 Name:") && submodelName == "no name") //backup in case no name got set which can happen
          submodelName = submodelLine.slice(9).toLowerCase();
      }

      if (isCustomPart) //skip adding it as partmodel as it's just a custom part
        continue;

      const ldrSubmodel = new SimpleLdrSubmodel(submodelName, references);

      if (!topSubmodelSet) { topLdrSubmodel = ldrSubmodel; topSubmodelSet = true; }

      ldrSubModelMap.set(submodelName, ldrSubmodel);
    }

    return { "submodelMap": ldrSubModelMap, "topLdrSubmodel": topLdrSubmodel };
  }

  private parseLineTypeOne(line: string): PartReference {
    const splittedLine = this.ioFileService.splitter(line, " ", 14);
    return new PartReference(splittedLine[splittedLine.length - 1].split(".dat")[0], new Matrix4(), parseInt(splittedLine[1]), false);
  }
}
