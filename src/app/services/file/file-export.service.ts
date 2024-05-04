import { Injectable } from '@angular/core';
import { Matrix4 } from 'three';
import * as zip from "@zip.js/zip.js";
import { PartReference } from '../../model/ldrawParts';
import { IoFileService } from './io-file.service';
import { LdrawColorService } from './ldraw-color.service';
import { SimpleLdrSubmodel, SimpleReference } from '../../model/simpleLdrawParts';
import manualExportPartMappingList from '../../../assets/ldr/lists/manualExportPartMappingList.json'
import mappedPrintedList from '../../../assets/ldr/lists/mappedPrintedList.json'
import partsList from '../../../assets/ldr/lists/partsList.json'
import { MultiPartMapping, SinglePartMapping,PrintPartMapping } from 'src/app/model/partMappings';

@Injectable({
  providedIn: 'root'
})
export class FileExportService {

  private replaceColor: boolean = true;

  private separationString: string = "###";

  private backendFetchUrl: string = "https://worker.flosrocketbackend.com/viewer/?apiurl=";

  private countedPartMap: Map<string, number> = new Map<string, number>();
  private usedPartsSet = new Set<string>();

  private modelPartMappings: Map<string, { r: string, b: string }> = new Map();

  constructor(private ioFileService: IoFileService, private ldrawColorService: LdrawColorService) { }

  async collectUsedPartsMappings(url:string): Promise<void> {
    //fetch the moc specific partmapping list
    const fetchResult = await fetch(this.backendFetchUrl + url + "_parts.json");
    let mocSpecificMappedParts : SinglePartMapping[] = [];
    if (fetchResult.status != 404)
      mocSpecificMappedParts = (await fetchResult.json()) as SinglePartMapping[];

    const allPartsList: MultiPartMapping[] = (partsList as MultiPartMapping[]);
    const printedMapping: PrintPartMapping[] = (mappedPrintedList as PrintPartMapping[]);
    const manualPartMapping: SinglePartMapping[] = (manualExportPartMappingList as SinglePartMapping[]);
    this.modelPartMappings.clear();
    for (let usedPartId of this.usedPartsSet) {
      usedPartId = usedPartId.slice(0, -4);
      
      const specificmappedPart = mocSpecificMappedParts.find(printMapping => printMapping.l == usedPartId); //checking if it is a manually mapped part
      if(specificmappedPart != undefined){
        this.modelPartMappings.set(usedPartId,{r:specificmappedPart.r,b:specificmappedPart.b});
        continue;
      }

      const mappedPart = manualPartMapping.find(printMapping => printMapping.l == usedPartId); //checking if it is a manually mapped part
      if(mappedPart != undefined){
        this.modelPartMappings.set(usedPartId,{r:mappedPart.r,b:mappedPart.b});
        continue;
      }

      let ldrawId = usedPartId; //might actually not be an ldraw id at this point but that will be fixed below (or later)

      const actualLdrawId = printedMapping.filter(printMapping => printMapping.b == usedPartId); //checking if it is a printed part bricklink id
      if(actualLdrawId.length > 0){
        ldrawId = actualLdrawId[0].l;
      }
      let alert = 0;
      for (let partMapping of allPartsList) { //TODO assert that 
        if (partMapping.l.includes(ldrawId)){ //at this point this should only be valid once
          this.modelPartMappings.set(usedPartId,{r:partMapping.r,b:partMapping.b[0]});
          alert += 1;
          //continue;
        }
      }
      if(alert > 1)
        console.error("Error: "+ldrawId+" has multiple mappings, check the python validation script!");
    }
  }

  async getXml(url: string, placeholderColor: string): Promise<string> {
    this.countedPartMap.clear();
    await this.collectParts(url);
    await this.collectUsedPartsMappings(url);

    const placeHolderColorcode = this.ldrawColorService.getPlaceholderColorCode(placeholderColor);


    let xml = "<INVENTORY>\n";
    for (let key of this.countedPartMap.keys()) {
      const colorIdKey = key.split(this.separationString); //1sr part contains color, 2nd the id
      let color = "0";
      if (!this.replaceColor || placeHolderColorcode != Number(colorIdKey[0])) { //if the color is not the to be replaced one
        color = "" + this.ldrawColorService.getBricklinkColorOf(colorIdKey[0],0);
      }

      if(!this.modelPartMappings.has(colorIdKey[1].split(".dat")[0]))
        console.error("Part with ID"+colorIdKey[1].split(".dat")[0]+" not found!")
      
      xml += "	<ITEM>\n		<ITEMTYPE>P</ITEMTYPE>\n		<ITEMID>" + this.modelPartMappings.get(colorIdKey[1].split(".dat")[0])?.b + "</ITEMID>\n		<COLOR>" + color + "</COLOR>\n		<MINQTY>" + this.countedPartMap.get(key) + "</MINQTY>\n	</ITEM>";
    }
    xml += "</INVENTORY>";

    this.countedPartMap.clear();
    this.usedPartsSet.clear();
    this.modelPartMappings.clear();
    return xml;
  }

  async getCsv(url: string, colorName: string): Promise<string> {
    this.countedPartMap.clear();
    await this.collectParts(url);
    await this.collectUsedPartsMappings(url);

    const placeHolderColorcode = this.ldrawColorService.getPlaceholderColorCode(colorName);

    let csv = "Part,Color,Quantity,Is Spare\n";
    for (let key of this.countedPartMap.keys()) {
      const colorIdKey = key.split(this.separationString);
      let color = "9999";
      if (!this.replaceColor || placeHolderColorcode != Number(colorIdKey[0])) { //if the color is not the to be replaced one
        color = "" + this.ldrawColorService.getRebrickableColorOf(colorIdKey[0],9999);
      }

      if(!this.modelPartMappings.has(colorIdKey[1].split(".dat")[0]))
        console.error("Part with ID "+colorIdKey[1].split(".dat")[0]+" not found!")

      csv += this.modelPartMappings.get(colorIdKey[1].split(".dat")[0])?.r + "," + color + "," + this.countedPartMap.get(key) + ",False\n";
    }

    this.countedPartMap.clear();
    this.usedPartsSet.clear();
    this.modelPartMappings.clear();
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
          this.usedPartsSet.add(reference.name);
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
      if (model) {
        const decompressedBlob = await model.getData(new zip.BlobWriter());
        return decompressedBlob.text();
      }
    } catch (e) {
      console.log("Error extracting ldr from io file!");
      console.log(e);
    }
    return "";
  }

  private parseSubmodels(submodels: string[]) {
    console.log("Now parsing submodels!");
    const ldrSubModelMap = new Map<string, SimpleLdrSubmodel>();
    let topSubmodelSet: boolean = false;
    let topLdrSubmodel: SimpleLdrSubmodel = new SimpleLdrSubmodel("", []);
    //for each submodel inside the ldr file
    submodels.forEach(submodel => {
      const submodelLines = submodel.split("\n");

      let partName: string = "no name";
      const references: SimpleReference[] = [];
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
      const ldrSubmodel = new SimpleLdrSubmodel(partName, references);

      if (!topSubmodelSet) { topLdrSubmodel = ldrSubmodel; topSubmodelSet = true; }

      ldrSubModelMap.set(partName, ldrSubmodel);
    });

    return { "submodelMap": ldrSubModelMap, "topLdrSubmodel": topLdrSubmodel };
  }

  private parseLineTypeOne(line: string): PartReference {
    const splittedLine = this.ioFileService.splitter(line, " ", 14);
    return new PartReference(splittedLine[splittedLine.length - 1], new Matrix4(), parseInt(splittedLine[1]), false);
  }
}
