import { Injectable } from '@angular/core';
import { BufferGeometry, Group, Line, LineBasicMaterial, LineSegments, Matrix3, Matrix4, Mesh, MeshStandardMaterial, Vector3, Vector4 } from 'three';
import { LdrPart, LdrSubmodel, PartReference } from '../model/ldrawParts';
import { LdrawColorService } from './ldraw-color.service';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils';

@Injectable({
  providedIn: 'root'
})
export class IoFileService {

  //private printMapping: Map<string, string> = new Map<string, string>;

  private allPartsMap: Map<string, LdrPart> = new Map<string, LdrPart>;

  //base URL from where to fetch the part files
  private backendFetchUrl: string = "https://wandering-breeze-a826.flomodoyt1960.workers.dev/viewer/?apiurl=";

  constructor(private ldrawColorService: LdrawColorService) {
    //read in printmapping file
    /*this.httpClient.get('assets/ldr/lists/mappedPrintedList.txt', { responseType: 'text' })
      .subscribe(data => {
        data.split('\n').forEach(line => {
          let lineSplit = line.split(",");
          this.printMapping.set(lineSplit[0], lineSplit[1]);
        })
      });*/
  }

  async getModel(ioUrl: string): Promise<Group> {
    let ldrUrl = ioUrl.slice(0, ioUrl.length - 2) + "ldr"
    //console.log("Fetching MOC:", this.backendFetchUrl + ldrUrl);
    const contents = await fetch(this.backendFetchUrl + ldrUrl);
    let moc = this.createMesh(await contents.text());
    this.allPartsMap.clear();
    return moc;
  }

  //This function creates the group of meshes for use of the 3d renderer out of a ldr file
  private createMesh(ldrFile: string): Group {
    const ldrObjects = ldrFile.split("0 NOSUBMODEL"); //0 = submodels, 1 = parts

    if (ldrObjects.length != 2) {
      console.log("Error: file is formated wrong, no submodel divider found");
      return new Group();
    }

    const submodels = this.parseSubmodels(ldrObjects[0].split("0 NOFILE"));
    this.parseParts(ldrObjects[1].split("0 NOFILE"));

    console.log("Now resolving the model!")
    //resolve all submodels starting from top to bottom
    return this.resolveSubmodel(submodels.topLdrSubmodel, submodels.submodelNames, submodels.submodelMap);
  }

  private parseSubmodels(submodels: string[]) {
    console.log("Now parsing submodels!");
    let topSubmodelSet: boolean = false;
    let topLdrSubmodel: LdrSubmodel = new LdrSubmodel("", []);
    const ldrSubModelMap = new Map<string, LdrSubmodel>;
    const ldrSubModelNames: string[] = [];
    //for each submodel inside the ldr file
    submodels.forEach(submodel => {
      const submodelLines = submodel.split("\n");

      let partName: string = "no name";
      const references: PartReference[] = [];
      //iterate all lines of a ldr submodel and parse them
      submodelLines.forEach((submodelLine, index) => {
        if (submodelLine.endsWith("\r"))
          submodelLine = submodelLine.slice(0, submodelLine.lastIndexOf("\r"));
        if (submodelLine.startsWith("1"))
          references.push(this.parseLineTypeOne(submodelLine, submodelLines[index - 1].includes("0 BFC INVERTNEXT")));
        else if (submodelLine.startsWith("0 FILE"))
          partName = submodelLine.slice(7).toLowerCase();
        else if (submodelLine.startsWith("0 Name:") && partName == "no name") //backup in case no name got set which can happen
          partName = submodelLine.slice(9).toLowerCase();
      });
      const ldrSubmodel = new LdrSubmodel(partName, references);

      if (!topSubmodelSet) { topLdrSubmodel = ldrSubmodel; topSubmodelSet = true; }

      ldrSubModelMap.set(partName, ldrSubmodel);
      ldrSubModelNames.push(partName);
    });

    return { "topLdrSubmodel": topLdrSubmodel, "submodelMap": ldrSubModelMap, "submodelNames": ldrSubModelNames };
  }

  private parseParts(parts: string[]) {
    console.log("Now parsing parts!");
    parts.forEach(partLines => {
      const parsedPart: LdrPart = this.parsePartLines(partLines);
      this.allPartsMap.set(parsedPart.name, parsedPart);
    });
  }

  //This function resolves a submodel and returns a threejs group: that means that it takes all vertices of all parts and puts them into meshes and collects all groups of its submodels
  private resolveSubmodel(submodel: LdrSubmodel, ldrSubModelNames: string[], ldrSubModelMap: Map<string, LdrSubmodel>): Group {
    //if the submodel has already been worked with it is ready already
    //console.log("Now resolving submodel: "+submodel.name);

    if (submodel.resolved) {
      return submodel.group;
    }
    //the group to collect all the meshes and other groups in
    const submodelGroup = new Group();

    for (const reference of submodel.references) { //this loop goes through all references to other parts/submodels inside the current submodel
      const matchingSubmodel: LdrSubmodel | undefined = ldrSubModelMap.get(reference.name);
      if (matchingSubmodel) {// reference is a submodel
        const referenceSubmodelGroup = (this.resolveSubmodel(matchingSubmodel, ldrSubModelNames, ldrSubModelMap)).clone();
        referenceSubmodelGroup.applyMatrix4(reference.transformMatrix);
        submodelGroup.add(referenceSubmodelGroup);
      } else {// reference is a part
        let referencedPart = this.resolvePart(reference.name);
        referencedPart.pointColorMap.forEach((points, color) => { //for each color of the part an own mesh gets created
          let partGeometry = new BufferGeometry();
          partGeometry.setFromPoints(points);

          //FIX transformation matrix for 28192
          if (reference.name == "28192.dat") {
            partGeometry.rotateY(-Math.PI / 2);
            partGeometry.translate(-10, -24, 0);
          } //FIX transformation matrix for 37762
          else if (reference.name == "37762.dat") {
            partGeometry.translate(0, -8, 0);
          }

          partGeometry.applyMatrix4(reference.transformMatrix);
          partGeometry.computeVertexNormals();
          partGeometry.computeBoundingBox();
          partGeometry.normalizeNormals();
          partGeometry = BufferGeometryUtils.mergeVertices(partGeometry, 0.1);

          let material; //TODO implement colors fully -> might have to remove resolved submodels to get color all the way to the bottom to each part that needs it
          if (color == 24 || color == 16 || color == -1 || color == -2) //those are not valid colors or mean that the color gets resolved in a submodel above, not fully implemented yet
            material = new MeshStandardMaterial({ color: this.ldrawColorService.resolveColor(reference.color) });
          else
            material = new MeshStandardMaterial({ color: this.ldrawColorService.resolveColor(color) });
          submodelGroup.add(new Mesh(partGeometry, material));
        });

        referencedPart.lineColorMap.forEach((points, color) => { //for each color of the part an own mesh gets created
          let partGeometry = new BufferGeometry();
          partGeometry.setFromPoints(points);

          //FIX transformation matrix for 28192
          if (reference.name == "28192.dat") {
            partGeometry.rotateY(-Math.PI / 2);
            partGeometry.translate(-10, -24, 0);
          } //FIX transformation matrix for 37762
          else if (reference.name == "37762.dat") {
            partGeometry.translate(0, -8, 0);
          }

          partGeometry.applyMatrix4(reference.transformMatrix);
          partGeometry.computeVertexNormals();
          partGeometry.normalizeNormals();
          partGeometry = BufferGeometryUtils.mergeVertices(partGeometry, 0.1);

          let material; //TODO implement colors fully -> might have to remove resolved submodels to get color all the way to the bottom to each part that needs it
          if (color == 24 || color == 16 || color == -1 || color == -2) //those are not valid colors or mean that the color gets resolved in a submodel above, not fully implemented yet
          {
            //material = new LineBasicMaterial({ color: this.ldrawColorService.resolveColor(reference.color) });
            if (reference.color == 0)
              material = new LineBasicMaterial({ color: this.ldrawColorService.resolveColor(71) });
            else
              material = new LineBasicMaterial({ color: this.ldrawColorService.resolveColor(0) });
          }
          else
            material = new LineBasicMaterial({ color: this.ldrawColorService.resolveColor(color) });
          submodelGroup.add(new LineSegments(partGeometry, material));
        });
      }
    }
    submodel.group = submodelGroup;
    submodel.resolved = true;

    return submodelGroup;
  }

  private resolvePart(partName: string): LdrPart {
    const ldrPart = this.allPartsMap.get(partName);
    if (ldrPart && !ldrPart.isResolved) {
      //resolve Part
      //console.log("Resolving part: "+partName);
      ldrPart.references.forEach(partReference => {
        let referencedPart = this.allPartsMap.get(partReference.name)
        if (referencedPart) {
          const referencedPart = this.resolvePart(partReference.name);
          //for all colors and their vertices that the referenced part has
          referencedPart.pointColorMap.forEach((referencePoints, referenceColor) => {
            const transformedPoints: Vector3[] = [];
            //transform points with transformation matrix of the reference to the part
            for (const referencePoint of referencePoints) {
              let pointVector4: Vector4 = new Vector4(referencePoint.x, referencePoint.y, referencePoint.z, 1);

              pointVector4 = pointVector4.applyMatrix4(partReference.transformMatrix);
              transformedPoints.push(new Vector3(pointVector4.x, pointVector4.y, pointVector4.z));
            }

            if (partReference.invert)
              transformedPoints.reverse();

            //append points of referenced part to the upper part to reduce the size of render hierachy
            if (ldrPart?.pointColorMap.has(referenceColor)) {
              const fullList = ldrPart?.pointColorMap.get(referenceColor)?.concat(transformedPoints)
              ldrPart?.pointColorMap.set(referenceColor, fullList ? fullList : []);
            } else
              ldrPart?.pointColorMap.set(referenceColor, transformedPoints);
          });

          referencedPart.lineColorMap.forEach((referencePoints, referenceColor) => {
            const transformedPoints: Vector3[] = [];
            //transform points with transformation matrix of the reference to the part
            for (const referencePoint of referencePoints) {
              let pointVector4: Vector4 = new Vector4(referencePoint.x, referencePoint.y, referencePoint.z, 1);

              pointVector4 = pointVector4.applyMatrix4(partReference.transformMatrix);
              transformedPoints.push(new Vector3(pointVector4.x, pointVector4.y, pointVector4.z));
            }
            if (partReference.invert) {
              transformedPoints.reverse();
            }
            //append points of referenced part to the upper part to reduce the size of render hierachy
            if (ldrPart?.lineColorMap.has(referenceColor)) {
              const fullList = ldrPart?.lineColorMap.get(referenceColor)?.concat(transformedPoints)
              ldrPart?.lineColorMap.set(referenceColor, fullList ? fullList : []);
            } else
              ldrPart?.lineColorMap.set(referenceColor, transformedPoints);
          });
        }
      });
      ldrPart.isResolved = true;
      return ldrPart;
    }
    else {
      if (ldrPart)
        return ldrPart;
      throw ("Error: Part could not be found: " + partName);
    }
  }

  //This function parses a ldr part from text
  private parsePartLines(partText: string): LdrPart {
    const partLines = partText.split("\n");

    let partName: string = "ERROR FLO";
    const references: PartReference[] = [];
    let invertNext: boolean = false;
    const pointColorMap = new Map<number, Vector3[]>;
    const lineColorMap = new Map<number, Vector3[]>;
    let isCW = false;

    //Go through all lines of text and parse them
    partLines.forEach(partLine => {
      if (partLine.endsWith("\r")) //removes annoying stuff
        partLine = partLine.slice(0, partLine.lastIndexOf("\r"));
      if (partLine.startsWith("1")) { //line is a reference
        references.push(this.parseLineTypeOne(partLine, invertNext));
        invertNext = false;
      }
      else if (partLine.startsWith("0 FILE")) { //line is a part name
        partName = partLine.slice(7);
        invertNext = false;
      }
      else if (partLine.startsWith("0 BFC INVERTNEXT")) //line enables BFC for the next line
        invertNext = true;
      else if (partLine.startsWith("0 BFC CERTIFY CW")) //line enables BFC for the next line
        isCW = true;
      else if (partLine.startsWith("3")) { //line is a triangle
        const parsed = this.parseLineTypeThree(partLine, (invertNext || isCW) && !(invertNext && isCW));
        let entry = pointColorMap.get(parsed.color);
        entry == undefined ? entry = [] : undefined;
        pointColorMap.set(parsed.color, entry.concat(parsed.points));
        invertNext = false;
      }
      else if (partLine.startsWith("4")) { //line is a rectangle
        const parsed = this.parseLineTypeFour(partLine, (invertNext || isCW) && !(invertNext && isCW));
        let entry = pointColorMap.get(parsed.color);
        entry == undefined ? entry = [] : undefined;
        pointColorMap.set(parsed.color, entry.concat(parsed.points));
        invertNext = false;
      }
      else if (partLine.startsWith("2")) { //line is a line
        const parsed = this.parseLineTypeTwo(partLine);
        let entry = lineColorMap.get(parsed.color);
        entry == undefined ? entry = [] : undefined;
        lineColorMap.set(parsed.color, entry.concat(parsed.points));
        invertNext = false;
      }
    });

    return new LdrPart(partName, pointColorMap, lineColorMap, references);
  }

  //This functions parses a line type one, which is a reference to a part or a submodel in a ldr file
  private parseLineTypeOne(line: string, invert: boolean): PartReference {
    const splittedLine = this.splitter(line, " ", 14);
    const transform = new Matrix4();

    const invertOrNo = new Matrix3();
    invertOrNo.set(parseFloat(splittedLine[5]), parseFloat(splittedLine[6]), parseFloat(splittedLine[7]), parseFloat(splittedLine[8]), parseFloat(splittedLine[9]), parseFloat(splittedLine[10]), parseFloat(splittedLine[11]), parseFloat(splittedLine[12]), parseFloat(splittedLine[13]));
    if (invertOrNo.determinant() < 0) 
      invert = !invert;

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

  //This functions parses a line type two, which is a line
  private parseLineTypeTwo(line: string) {
    const splitLine = line.split(" ");
    if (splitLine.length < 8) {
      throw "line with too few coordinates";
    }

    return {
      color: parseInt(splitLine[1]),
      points: [
        new Vector3(parseFloat(splitLine[2]), parseFloat(splitLine[3]), parseFloat(splitLine[4])),
        new Vector3(parseFloat(splitLine[5]), parseFloat(splitLine[6]), parseFloat(splitLine[7]))
      ]
    }
  }

  //This functions parses a line type five, which is an optional line
  private parseLineTypeFive(line: string) {
    let splitLine = line.split(" ");
    if (splitLine.length < 10) {
      throw "optional line with too few coordinates";
    }

    return {
      color: parseInt(splitLine[1]),
      points: [
        new Vector3(parseFloat(splitLine[2]), parseFloat(splitLine[3]), parseFloat(splitLine[4])),
        new Vector3(parseFloat(splitLine[5]), parseFloat(splitLine[6]), parseFloat(splitLine[7])),
        new Vector3(parseFloat(splitLine[8]), parseFloat(splitLine[9]), parseFloat(splitLine[10]))
      ]
    }
  }

  //This functions parses a line type three, which is a triangle
  private parseLineTypeThree(line: string, invert: boolean) {
    const splitLine = line.split(" ");
    if (splitLine.length < 10) {
      throw "Triangle with too few coordinates";
    }
    if (!invert) {
      return {
        color: parseInt(splitLine[1]),
        points: [
          new Vector3(parseFloat(splitLine[2]), parseFloat(splitLine[3]), parseFloat(splitLine[4])),
          new Vector3(parseFloat(splitLine[5]), parseFloat(splitLine[6]), parseFloat(splitLine[7])),
          new Vector3(parseFloat(splitLine[8]), parseFloat(splitLine[9]), parseFloat(splitLine[10]))
        ]
      }
    } else {
      return {
        color: parseInt(splitLine[1]),
        points: [
          new Vector3(parseFloat(splitLine[8]), parseFloat(splitLine[9]), parseFloat(splitLine[10])),
          new Vector3(parseFloat(splitLine[5]), parseFloat(splitLine[6]), parseFloat(splitLine[7])),
          new Vector3(parseFloat(splitLine[2]), parseFloat(splitLine[3]), parseFloat(splitLine[4]))
        ]
      }
    }
  }

  //This functions parses a line type four, which is a rectangle, but i just split those into two triangles
  private parseLineTypeFour(line: string, invert: boolean) {
    const splitLine = line.split(" ");
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
          new Vector3(parseFloat(splitLine[2]), parseFloat(splitLine[3]), parseFloat(splitLine[4]))
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
          new Vector3(parseFloat(splitLine[8]), parseFloat(splitLine[9]), parseFloat(splitLine[10]))
        ]
      }
    }
  }
}
