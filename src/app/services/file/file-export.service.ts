import {Injectable} from '@angular/core';
import {Matrix4} from 'three';
import * as zip from "@zip.js/zip.js";
import {PartReference} from '../../model/ldrawParts';
import {LdrawColorService} from '../color/ldraw-color.service';
import {SimpleLdrSubmodel, SimpleReference} from '../../model/simpleLdrawParts';
import {PartMapping, SpecificPartMapping, PartMappingFix, BricklinkRefactoredPart} from 'src/app/model/partMappings';
import bricklink_refactored_parts from '../../../assets/ldr/lists/bricklink_refactored_parts.json'
import {environment} from "../../../environments/environment";
import {ExportSettingsService} from "./export-settings.service";
import {splitter} from "../../utils/ldrUtils";

@Injectable({
  providedIn: 'root'
})
export class FileExportService {

  private separationString = "###";

  private readonly DEFAULT_BRICKLINK_ANY_COLOR_ID = 0;
  private readonly DEFAULT_REBRICKABLE_ANY_COLOR_ID = 9999;
  private readonly DEFAULT_LDRAW_ANY_COLOR_ID = 499999;

  private countedPartMap = new Map<string, number>();
  private mappedCountedPartMap = new Map<string, number>();

  constructor(private ldrawColorService: LdrawColorService, private exportSettingsService: ExportSettingsService) {
  }

  async collectUsedPartsMappings(url: string, isBr: boolean): Promise<void> {

    const fetchResult = await fetch(environment.backendFetchUrl + url + "_pm.json");
    let mocSpecificMappedParts: SpecificPartMapping[] = [];
    if (fetchResult.status === 200)
      mocSpecificMappedParts = (await fetchResult.json()) as SpecificPartMapping[];

    const partList: PartMapping[] = await (await fetch("/assets/ldr/lists/partList.json")).json() as PartMapping[];
    const partListFix: PartMappingFix[] = await (await fetch("/assets/ldr/lists/partListFix.json")).json() as PartMappingFix[];

    for (let countedPart of this.countedPartMap.keys()) {
      const colorIdKey = countedPart.split(this.separationString); //1sr part contains color, 2nd the id
      let mappedId = "";

      const specificmappedPart = mocSpecificMappedParts.find(printMapping => printMapping.l == colorIdKey[1]);
      if (specificmappedPart != undefined)
        mappedId = isBr ? specificmappedPart.b : specificmappedPart.r;
      else {
        const mappedPartFix = partListFix.find(part => part.io == colorIdKey[1]);
        if (mappedPartFix != undefined) {
          mappedId = isBr ? mappedPartFix.b : mappedPartFix.r;
        } else {
          const mappedPart = partList.find(part => part.b.length > 0 && part.r !== "" && part.l.includes(colorIdKey[1]));
          if (mappedPart != undefined) {
            if (mappedPart.b.length > 1) console.warn("Error: " + mappedPart + " has multiple mappings, check the python validation script!");
            else mappedId = isBr ? mappedPart.b[0] : mappedPart.r;
          }
        }
      }
      if (!mappedId) {
        console.error("No mapping found for part" + countedPart);
        continue;
      }
      const newKey = colorIdKey[0] + this.separationString + mappedId;
      const newCount = (this.mappedCountedPartMap.get(newKey) ?? 0) + (this.countedPartMap.get(countedPart) ?? 0);
      this.mappedCountedPartMap.set(newKey, newCount);
    }
  }

  async getXml(url: string, placeholderColor: string): Promise<string> {
    await this.collectParts(url);
    await this.collectUsedPartsMappings(url, true);

    const placeHolderColorCode = this.ldrawColorService.getLdrawColorIdByColorName(placeholderColor);

    const anyReplacementColor = this.exportSettingsService.getExportSettings();
    if (anyReplacementColor !== "") {
      const anyReplacementColorCode = this.ldrawColorService.getLdrawColorIdByColorName(anyReplacementColor);
      this.replaceColors(anyReplacementColorCode, placeHolderColorCode);
    }

    let xml = "<INVENTORY>\n";
    for (let key of this.mappedCountedPartMap.keys()) {
      const colorIdKey = key.split(this.separationString); //1st part contains color, 2nd the id
      const bricklinkColorId = this.ldrawColorService.getBricklinkColorIdByLdrawColorId(Number(colorIdKey[0]), this.DEFAULT_BRICKLINK_ANY_COLOR_ID);
      xml += "	<ITEM>\n		<ITEMTYPE>P</ITEMTYPE>\n		<ITEMID>" + colorIdKey[1] + "</ITEMID>\n		<COLOR>" + bricklinkColorId + "</COLOR>\n		<MINQTY>" + this.mappedCountedPartMap.get(key) + "</MINQTY>\n	</ITEM>";
    }
    xml += "</INVENTORY>";

    this.countedPartMap.clear();
    this.mappedCountedPartMap.clear();
    return xml;
  }

  private replaceColors(anyReplacementColorCode: number, placeHolderColorCode: number): void {
    let colorsToReplace = this.DEFAULT_LDRAW_ANY_COLOR_ID;
    if (placeHolderColorCode !== null && placeHolderColorCode !== -1)
      colorsToReplace = placeHolderColorCode;

    const parts: [string, number][] = [...this.mappedCountedPartMap.entries()];

    for (let i = 0; i < parts.length; i++) {
      const colorIdKey = parts[i][0].split(this.separationString); //1st part contains color, 2nd the id
      if (colorsToReplace === Number(colorIdKey[0])) {
        this.mappedCountedPartMap.get(parts[i][0])
        const newPartKey = anyReplacementColorCode + this.separationString + colorIdKey[1];
        const existingPartEntry = this.mappedCountedPartMap.get(newPartKey);
        if (existingPartEntry !== undefined) {
          this.mappedCountedPartMap.set(newPartKey, parts[i][1] + existingPartEntry);
        } else {
          this.mappedCountedPartMap.set(newPartKey, parts[i][1]);
        }
        this.mappedCountedPartMap.delete(parts[i][0]);
      }
    }
  }

  async getCsv(url: string, colorName: string): Promise<string> {
    await this.collectParts(url);
    await this.collectUsedPartsMappings(url, false);

    const placeHolderColorCode = this.ldrawColorService.getLdrawColorIdByColorName(colorName);

    const anyReplacementColor = this.exportSettingsService.getExportSettings();
    if (anyReplacementColor !== "") {
      const anyReplacementColorCode = this.ldrawColorService.getLdrawColorIdByColorName(anyReplacementColor);
      this.replaceColors(anyReplacementColorCode, placeHolderColorCode);
    }

    let csv = "Part,Color,Quantity,Is Spare\n";
    for (let key of this.mappedCountedPartMap.keys()) {
      const colorIdKey = key.split(this.separationString);
      const rebrickableColorId = this.ldrawColorService.getRebrickableColorIdByLdrawColorId(colorIdKey[0], this.DEFAULT_REBRICKABLE_ANY_COLOR_ID);
      csv += colorIdKey[1] + "," + rebrickableColorId + "," + this.mappedCountedPartMap.get(key) + ",False\n";
    }

    this.countedPartMap.clear();
    this.mappedCountedPartMap.clear();
    return csv;
  }

  private async collectParts(url: string): Promise<void> {
    const content = await fetch(environment.backendFetchUrl + url);
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
        }
      }
    );
  }

  async extractLdrFile(file: Response): Promise<string> {
    try {
      const blob = await file.blob();
      const options = {password: "soho0909", filenameEncoding: "utf-8"};
      const entries = await (new zip.ZipReader(new zip.BlobReader(blob), options)).getEntries();
      const model = entries.find(e => e.filename == "model.ldr");
      if (model && model.getData) {
        const blob = await model.getData(new zip.BlobWriter());
        return await blob.text();
      }
    } catch (e) {
      console.error("Error extracting ldr from io file!", e);
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
          } else
            submodelName = submodelLine.slice(7).toLowerCase();
        } else if (submodelLine.startsWith("0 Name:") && submodelName == "no name") //backup in case no name got set which can happen
          submodelName = submodelLine.slice(9).toLowerCase();
      }

      if (isCustomPart) //skip adding it as partmodel as it's just a custom part
        continue;

      const ldrSubmodel = new SimpleLdrSubmodel(submodelName, references);

      if (!topSubmodelSet) {
        topLdrSubmodel = ldrSubmodel;
        topSubmodelSet = true;
      }

      ldrSubModelMap.set(submodelName, ldrSubmodel);
    }

    return {"submodelMap": ldrSubModelMap, "topLdrSubmodel": topLdrSubmodel};
  }

  private parseLineTypeOne(line: string): PartReference {
    const splitLine = splitter(line, " ", 14);
    return new PartReference(splitLine[splitLine.length - 1].split(".dat")[0], new Matrix4(), parseInt(splitLine[1]), false);
  }

  private fixBricklinkRefactoredParts(): void {
    const partMappings: BricklinkRefactoredPart[] = bricklink_refactored_parts as BricklinkRefactoredPart[];
    const keysToRemove: string[] = [];
    for (let key of this.mappedCountedPartMap.keys()) {
      const colorIdKey = key.split(this.separationString); //1st part contains color, 2nd the id
      const value = this.mappedCountedPartMap.get(key);
      const mapping = partMappings.find(v => v.oldId === colorIdKey[1]);
      if (mapping && value !== undefined) {
        keysToRemove.push(key);
        const newColorIdKey = colorIdKey[0] + this.separationString + mapping.newId;
        this.mappedCountedPartMap.set(newColorIdKey, (this.mappedCountedPartMap.get(newColorIdKey) ?? 0) + value);
      }
    }
    for (let key in keysToRemove) {
      this.mappedCountedPartMap.delete(key);
    }
  }
}
