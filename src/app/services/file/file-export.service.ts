import { Injectable } from '@angular/core';
import { Matrix4 } from 'three';
import * as zip from "@zip.js/zip.js";
import { PartReference } from '../../model/ldrawParts';
import { IoFileService } from './io-file.service';
import { LdrawColorService } from './ldraw-color.service';
import { SimpleLdrSubmodel, SimpleReference } from '../../model/simpleLdrawParts';

@Injectable({
  providedIn: 'root'
})
export class FileExportService {

  private replaceColor: boolean = true;

  private splitString: string = "###";

  private backendFetchUrl: string = "https://worker.flosrocketbackend.com/viewer/?apiurl=";

  private countedPartMap: Map<string, number> = new Map<string, number>();

  constructor(private ioFileService: IoFileService, private ldrawColorService: LdrawColorService) { }

  async getXml(url: string, colorName: string): Promise<string> {
    this.countedPartMap.clear();
    await this.collectParts(url);

    const placeHolderColorcode = this.ldrawColorService.getPlaceholderColorCode(colorName);

    let xml = "<INVENTORY>\n";
    for (let key of this.countedPartMap.keys()) {
      const splitted = key.split(this.splitString); //1sr part contains color, 2nd the id
      let color = "0";
      if (!this.replaceColor || placeHolderColorcode != Number(splitted[0])) { //if the color is not the to be replaced one
        color = "" + this.ldrawColorService.getBricklinkColorOf(splitted[0]);
      }
      //check manually mapped export
      //check mapped printed
      //check parts list json
      



      //replace list has item if ldraw has multiple bricklink/rebrickable ids or if ldraw has no bricklink/rebrickable ids
      //l=...;r=...;b=...;\n
      //TODO: if replace list contains ldraw?? wtih same color then replace partnumber with new number+color
      //TODO: use for p of parts: if p.l.contains(splitted[1].split(".dat")[0]) then return bricklink number
      xml += "	<ITEM>\n		<ITEMTYPE>P</ITEMTYPE>\n		<ITEMID>" + splitted[1].split(".dat")[0] + "</ITEMID>\n		<COLOR>" + color + "</COLOR>\n		<MINQTY>" + this.countedPartMap.get(key) + "</MINQTY>\n	</ITEM>";
    }
    xml += "</INVENTORY>";

    this.countedPartMap.clear();
    return xml;
  }

  async getCsv(url: string, colorName: string): Promise<string> {
    this.countedPartMap.clear();
    await this.collectParts(url);

    const placeHolderColorcode = this.ldrawColorService.getPlaceholderColorCode(colorName);

    let csv = "BLItemNo,LDrawColorId,Qty\n";
    for (let key of this.countedPartMap.keys()) {
      const splitted = key.split(this.splitString);
      if (this.replaceColor && placeHolderColorcode == Number(splitted[0]))
        csv += splitted[1].split(".dat")[0] + ",9999," + this.countedPartMap.get(key) + "\n"
      else
        csv += splitted[1].split(".dat")[0] + "," + splitted[0] + "," + this.countedPartMap.get(key) + "\n"
    }

    this.countedPartMap.clear();
    return csv;
  }

  private async collectParts(url: string): Promise<void> {
    const content = await fetch(this.backendFetchUrl + url);
    const ldrFile = await this.extractLdrFile(content);

    //go through all things => collect submodels and parts

    const submodels = this.parseSubmodels(ldrFile.split("0 NOFILE"));
    const firstSubmodel = submodels.topLdrSubmodel;
    const allSubmodels = submodels.submodelMap;

    this.countedPartMap.clear();

    this.countParts(firstSubmodel, allSubmodels);

  }

  private countParts(currentSubmodel: SimpleLdrSubmodel, allSubmodels: Map<string, SimpleLdrSubmodel>) {
    currentSubmodel.references.forEach(
      reference => {
        const referencedSubmodel = allSubmodels.get(reference.name);
        if (referencedSubmodel)//if is submodel
          this.countParts(referencedSubmodel, allSubmodels);
        else { //if is part
          const id = reference.color + this.splitString + reference.name;
          this.countedPartMap.set(id, (this.countedPartMap.get(id) ?? 0) + 1);
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
