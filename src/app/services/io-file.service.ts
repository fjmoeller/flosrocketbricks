import { Injectable } from '@angular/core';
import * as zip from "@zip.js/zip.js";
import { BufferGeometry, Group, Matrix4, Mesh, MeshStandardMaterial, Vector3, Vector4 } from 'three';
import { LdrPart, LdrSubmodel, PartReference } from './ldrawParts';
import { HttpClient } from '@angular/common/http';
import { LdrawColorService } from './ldraw-color.service';


@Injectable({
  providedIn: 'root'
})
export class IoFileService {

  private partsList: string[] = [];
  private primitiveList: string[] = [];

  private savedLdrParts = new Map<string, LdrPart>;
  private savedLdrSubParts = new Map<string, LdrPart>;
  private savedLdrPrimitives = new Map<string, LdrPart>;
  private savedLdrHighPrimitives = new Map<string, LdrPart>;
  private savedLdrLowPrimitives = new Map<string, LdrPart>;

  private ldrUrl: string;

  private saveForLater: string = '"@zip.js/zip.js": "^2.6.83"';

  constructor(private httpClient: HttpClient, private ldrawColorService: LdrawColorService) {
    this.ldrUrl = "assets/ldr/parts/";
    this.httpClient.get('assets/ldr/lists/partsList.txt', { responseType: 'text' })
      .subscribe(data =>
        this.partsList = data.split('\r\n'));
    this.httpClient.get('assets/ldr/lists/primitiveList.txt', { responseType: 'text' })
      .subscribe(data =>
        this.primitiveList = data.split('\r\n'));
  }

  async getModel(url: string): Promise<Group> {
    console.log("Fetching:", url);
    const contents = await fetch(url);
    let ldrFile = await this.extractLdrFile(contents);
    return this.createMeshes2(ldrFile);
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

  async createMeshes2(ldrFile: string): Promise<Group> {
    const ldrObjects = ldrFile.split("0 NOFILE");

    let topSubmodelSet: boolean = false;
    let topLdrSubmodel: LdrSubmodel = new LdrSubmodel("", []);

    let ldrSubModelMap = new Map<string, LdrSubmodel>;
    let ldrSubModelNames: string[] = [];
    console.log("Total submodels in file:", ldrObjects.length);
    //for each object inside ldr file
    ldrObjects.forEach(ldrObject => {
      let ldrLine = ldrObject.split("\n");

      let subModelName: string = "no name";
      let references: PartReference[] = [];
      //iterate all lines of a ldr object
      ldrLine.forEach((ldrObjectLine, index) => {
        if (ldrObjectLine.endsWith("\r"))
          ldrObjectLine = ldrObjectLine.slice(0, ldrObjectLine.lastIndexOf("\r"));
        if (ldrObjectLine.startsWith("1"))
          references.push(this.parseLineTypeOne(ldrObjectLine, ldrLine[index - 1].includes("0 BFC INVERTNEXT")));
        else if (ldrObjectLine.startsWith("0 FILE"))
          subModelName = ldrObjectLine.slice(7).toLowerCase();
        else if (ldrObjectLine.startsWith("0 Name:") && subModelName == "no name") //backup in case no name got set which can happen
          subModelName = ldrObjectLine.slice(9).toLowerCase();
      });
      let ldrSubmodel = new LdrSubmodel(subModelName, references);

      if (!topSubmodelSet) { topLdrSubmodel = ldrSubmodel; topSubmodelSet = true; }

      ldrSubModelMap.set(subModelName, ldrSubmodel);
      ldrSubModelNames.push(subModelName);
      console.log("Parsing submodel " + subModelName + " finished!");
    });
    console.log("Now starting submodel resolving with the top submodel:", topLdrSubmodel.name);

    return await this.resolveSubmodel(topLdrSubmodel, ldrSubModelNames, ldrSubModelMap);
  }

  async resolveSubmodel(submodel: LdrSubmodel, ldrSubModelNames: string[], ldrSubModelMap: Map<string, LdrSubmodel>): Promise<Group> {
    if (submodel.resolved) {
      return submodel.group;
    }

    let submodelGroup = new Group();

    for (const reference of submodel.references) {
      let matchingSubmodel: LdrSubmodel | undefined = ldrSubModelMap.get(reference.name);
      if (matchingSubmodel) {// reference is a submodel

        let referenceSubmodelGroup = (await this.resolveSubmodel(matchingSubmodel, ldrSubModelNames, ldrSubModelMap)).clone();
        referenceSubmodelGroup.applyMatrix4(reference.transformMatrix);
        submodelGroup.add(referenceSubmodelGroup);

      } else {// reference is a part

        let referenceSubmodelMap = await this.resolvePart(reference.name);
        referenceSubmodelMap.forEach((points, color) => { //for each color of the part
          let partGeometry = new BufferGeometry();
          partGeometry.setFromPoints(points);

          partGeometry.applyMatrix4(reference.transformMatrix);
          partGeometry.computeVertexNormals();
          let material;
          if (color != 24 && color != 16 && color != -1 && color != -2)
            material = new MeshStandardMaterial({ color: this.ldrawColorService.resolveColor(color)});
          else
            material = new MeshStandardMaterial({ color: this.ldrawColorService.resolveColor(reference.color)});
          submodelGroup.add(new Mesh(partGeometry, material));
        });
      }
    }
    submodel.group = submodelGroup;
    submodel.resolved = true;
    console.log("Resolving submodel " + submodel.name + " has been finished!");

    return submodelGroup;
  }

  async fetchpart(partMap: Map<string, LdrPart>, path: string, partName: string, selectedMap: number) {
    if (partMap.has(partName)) {
      console.log("Part: " + path + " has been detected in cache");
      let ldrPart = partMap.get(partName);
      return { selectedMap: -1, partLdr: ldrPart, partText: "" };
    }
    console.log("Part: " + path + " has not been detected in cache");
    let url = this.ldrUrl + path;
    let partText = await ((await fetch(url)).text());
    return { selectedMap: selectedMap, partText: partText };
  }

  async resolvePart(partName: string): Promise<Map<number, Vector3[]>> {
    let ldrPart: LdrPart | undefined = undefined;

    let fetchedPart;
    //check if part is already resolved
    if (partName.startsWith("s\\"))  //subpart
      fetchedPart = await this.fetchpart(this.savedLdrSubParts, "parts/s/" + partName.substring(2), partName, 1);
    else if (partName.startsWith("48\\"))  //high primitive
      fetchedPart = await this.fetchpart(this.savedLdrHighPrimitives, "p/48/" + partName.substring(3), partName, 2);
    else if (partName.startsWith("8\\"))  //low primitive
      fetchedPart = await this.fetchpart(this.savedLdrLowPrimitives, "p/8/" + partName.substring(2), partName, 3);
    else if (this.partsList.includes(partName))  //part
      fetchedPart = await this.fetchpart(this.savedLdrParts, "parts/" + partName, partName, 4);
    else if (this.primitiveList.includes(partName))  //normal primitive
      fetchedPart = await this.fetchpart(this.savedLdrPrimitives, "p/" + partName, partName, 5);
    else
      throw ("ERROR: Part could not be found: " + partName);

    if (fetchedPart.partLdr) // part is already resolved
      return fetchedPart.partLdr.pointColorMap;
    // part hasnt been resolved yet
    ldrPart = this.parsePartLines(fetchedPart.partText);

    switch (fetchedPart.selectedMap) {
      case 1: this.savedLdrSubParts.set(partName, ldrPart); break;
      case 2: this.savedLdrHighPrimitives.set(partName, ldrPart); break;
      case 3: this.savedLdrLowPrimitives.set(partName, ldrPart); break;
      case 4: this.savedLdrParts.set(partName, ldrPart); break;
      case 5: this.savedLdrPrimitives.set(partName, ldrPart); break;
    }

    //resolve part references
    for (const reference of ldrPart.references) {
      let referenceColorPointMap = await this.resolvePart(reference.name);
      //for all colors that the subPart has
      referenceColorPointMap.forEach((referencePoints, referenceColor) => {
        let transformedPoints: Vector3[] = [];
        //transform points with transformation matrix of reference
        for (const referencePoint of referencePoints) {
          let pointVector4: Vector4 = new Vector4(referencePoint.x, referencePoint.y, referencePoint.z, 1);
          pointVector4 = pointVector4.applyMatrix4(reference.transformMatrix);
          transformedPoints.push(new Vector3(pointVector4.x, pointVector4.y, pointVector4.z));
        }
        //append points of subPart to part
        if (ldrPart?.pointColorMap.has(referenceColor)) {
          let fullList = ldrPart?.pointColorMap.get(referenceColor)?.concat(transformedPoints)
          ldrPart?.pointColorMap.set(referenceColor, fullList ? fullList : []);
        } else
          ldrPart?.pointColorMap.set(referenceColor, transformedPoints);
      });
    }
    
    return ldrPart.pointColorMap;
  }

  private parsePartLines(partText: string): LdrPart {
    let partLines = partText.split("\n");

    let partName: string = "ERROR FLO";
    let references: PartReference[] = [];
    let invertNext: boolean = false;
    let pointColorMap = new Map<number, Vector3[]>;

    partLines.forEach(partLine => {
      if (partLine.endsWith("\r"))
        partLine = partLine.slice(0, partLine.lastIndexOf("\r"));
      if (partLine.startsWith("1")) {
        references.push(this.parseLineTypeOne(partLine, invertNext));
        invertNext = false;
      }
      else if (partLine.startsWith("0 FILE")) {
        partName = partLine.slice(7);
        invertNext = false;
      }
      else if (partLine.startsWith("0 BFC"))
        invertNext = true;
      else if (partLine.startsWith("3")) {
        let parsed = this.parseLineTypeThree(partLine, invertNext);
        let entry = pointColorMap.get(parsed.color);
        entry == undefined ? entry = [] : undefined;
        pointColorMap.set(parsed.color, entry.concat(parsed.points));
        invertNext = false;
      }
      else if (partLine.startsWith("4")) {
        let parsed = this.parseLineTypeFour(partLine, invertNext);
        let entry = pointColorMap.get(parsed.color);
        entry == undefined ? entry = [] : undefined;
        pointColorMap.set(parsed.color, entry.concat(parsed.points));
        invertNext = false;
      }
    });

    return new LdrPart(partName, pointColorMap, references);
  }

  private parseLineTypeOne(line: string, invert: boolean): PartReference {
    const splittedLine = this.splitter(line, " ", 14);
    let transform = new Matrix4();

    transform.set(
      parseFloat(splittedLine[5]), parseFloat(splittedLine[6]), parseFloat(splittedLine[7]), parseFloat(splittedLine[2]),
      parseFloat(splittedLine[8]), parseFloat(splittedLine[9]), parseFloat(splittedLine[10]), parseFloat(splittedLine[3]),
      parseFloat(splittedLine[11]), parseFloat(splittedLine[12]), parseFloat(splittedLine[13]), parseFloat(splittedLine[4]),
      0, 0, 0, 1
    );

    return new PartReference(splittedLine[splittedLine.length - 1], transform, parseInt(splittedLine[1]), invert);
  }

  //helper method to do splits where the rest is appended in the last field and doesnt get cut of
  splitter(input: string, separator: string, limit: number) {
    // Ensure the separator is global
    let newSeparator = new RegExp(separator, 'g');
    // Allow the limit argument to be excluded
    limit = limit ?? -1;

    const output = [];
    let finalIndex = 0;

    while (limit--) {
      const lastIndex = newSeparator.lastIndex;
      const search = newSeparator.exec(input);
      if (search === null) {
        break;
      }
      finalIndex = newSeparator.lastIndex;
      output.push(input.slice(lastIndex, search.index));
    }

    output.push(input.slice(finalIndex));

    return output;
  }

  private parseLineTypeThree(line: string, invert: boolean) {
    let splitLine = line.split(" ");
    if (splitLine.length < 10) {
      throw "Triangle with too few coordinates";
    }
    if (!invert) {
      return {
        color: parseInt(splitLine[1]),
        points: [
          new Vector3(parseFloat(splitLine[2]), parseFloat(splitLine[3]), parseFloat(splitLine[4])),
          new Vector3(parseFloat(splitLine[5]), parseFloat(splitLine[6]), parseFloat(splitLine[7])),
          new Vector3(parseFloat(splitLine[8]), parseFloat(splitLine[9]), parseFloat(splitLine[10])),
          //Bfc
          new Vector3(parseFloat(splitLine[4]), parseFloat(splitLine[3]), parseFloat(splitLine[2])),
          new Vector3(parseFloat(splitLine[7]), parseFloat(splitLine[6]), parseFloat(splitLine[5])),
          new Vector3(parseFloat(splitLine[10]), parseFloat(splitLine[9]), parseFloat(splitLine[8]))
        ]
      }
    } else {
      return {
        color: parseInt(splitLine[1]),
        points: [
          new Vector3(parseFloat(splitLine[4]), parseFloat(splitLine[3]), parseFloat(splitLine[2])),
          new Vector3(parseFloat(splitLine[7]), parseFloat(splitLine[6]), parseFloat(splitLine[5])),
          new Vector3(parseFloat(splitLine[10]), parseFloat(splitLine[9]), parseFloat(splitLine[8])),
          //Bfc
          new Vector3(parseFloat(splitLine[2]), parseFloat(splitLine[3]), parseFloat(splitLine[4])),
          new Vector3(parseFloat(splitLine[5]), parseFloat(splitLine[6]), parseFloat(splitLine[7])),
          new Vector3(parseFloat(splitLine[8]), parseFloat(splitLine[9]), parseFloat(splitLine[10]))
        ]
      }
    }
  }

  private parseLineTypeFour(line: string, invert: boolean) {
    let splitLine = line.split(" ");
    if (splitLine.length < 13) {
      throw "Rectangle with too few coordinates";
    }
    if (!invert) {
      return {
        color: parseInt(splitLine[1]),
        points: [
          new Vector3(parseFloat(splitLine[2]), parseFloat(splitLine[3]), parseFloat(splitLine[4])),
          new Vector3(parseFloat(splitLine[5]), parseFloat(splitLine[6]), parseFloat(splitLine[7])),
          new Vector3(parseFloat(splitLine[8]), parseFloat(splitLine[9]), parseFloat(splitLine[10])),
          new Vector3(parseFloat(splitLine[8]), parseFloat(splitLine[9]), parseFloat(splitLine[10])),
          new Vector3(parseFloat(splitLine[11]), parseFloat(splitLine[12]), parseFloat(splitLine[13])),
          new Vector3(parseFloat(splitLine[2]), parseFloat(splitLine[3]), parseFloat(splitLine[4])),
          //Bfc
          new Vector3(parseFloat(splitLine[8]), parseFloat(splitLine[9]), parseFloat(splitLine[10])),
          new Vector3(parseFloat(splitLine[5]), parseFloat(splitLine[6]), parseFloat(splitLine[7])),
          new Vector3(parseFloat(splitLine[2]), parseFloat(splitLine[3]), parseFloat(splitLine[4])),
          new Vector3(parseFloat(splitLine[2]), parseFloat(splitLine[3]), parseFloat(splitLine[4])),
          new Vector3(parseFloat(splitLine[11]), parseFloat(splitLine[12]), parseFloat(splitLine[13])),
          new Vector3(parseFloat(splitLine[8]), parseFloat(splitLine[9]), parseFloat(splitLine[10]))
        ]
      }
    } else {
      return {
        color: parseInt(splitLine[1]),
        points: [
          new Vector3(parseFloat(splitLine[8]), parseFloat(splitLine[9]), parseFloat(splitLine[10])),
          new Vector3(parseFloat(splitLine[5]), parseFloat(splitLine[6]), parseFloat(splitLine[7])),
          new Vector3(parseFloat(splitLine[2]), parseFloat(splitLine[3]), parseFloat(splitLine[4])),
          new Vector3(parseFloat(splitLine[2]), parseFloat(splitLine[3]), parseFloat(splitLine[4])),
          new Vector3(parseFloat(splitLine[11]), parseFloat(splitLine[12]), parseFloat(splitLine[13])),
          new Vector3(parseFloat(splitLine[8]), parseFloat(splitLine[9]), parseFloat(splitLine[10])),
          //Bfc
          new Vector3(parseFloat(splitLine[2]), parseFloat(splitLine[3]), parseFloat(splitLine[4])),
          new Vector3(parseFloat(splitLine[5]), parseFloat(splitLine[6]), parseFloat(splitLine[7])),
          new Vector3(parseFloat(splitLine[8]), parseFloat(splitLine[9]), parseFloat(splitLine[10])),
          new Vector3(parseFloat(splitLine[8]), parseFloat(splitLine[9]), parseFloat(splitLine[10])),
          new Vector3(parseFloat(splitLine[11]), parseFloat(splitLine[12]), parseFloat(splitLine[13])),
          new Vector3(parseFloat(splitLine[2]), parseFloat(splitLine[3]), parseFloat(splitLine[4]))
        ]
      }
    }
  }
}
