import { Injectable } from '@angular/core';
//import * from 'stream/web'
import * as zip from "@zip.js/zip.js";
import { BufferGeometry, Group, Matrix4, Mesh, MeshNormalMaterial, Vector3, Vector4 } from 'three';
import { LdrPart, PartReference } from './ldrawParts';

@Injectable({
  providedIn: 'root'
})
export class IoFileService {

  private backendUrl: string = "https://wandering-breeze-a826.flomodoyt1960.workers.dev/viewer/?apiurl=";

  constructor() { }

  async getModel(url: string): Promise<Group> {
    console.log("Fetching:", url);
    const contents = await fetch(this.backendUrl + url);
    let ldrFile = await this.extractLdrFile(contents);
    return this.createMeshes(ldrFile).rotateOnWorldAxis(new Vector3(0, 0, 1), 3.1416);
  }



  async extractLdrFile(file: any): Promise<string> {
    try {
      console.log("starting!");
      const blob = await file.blob();
      const options = { password: "soho0909", filenameEncoding: "utf-8" };
      const entries = await (new zip.ZipReader(new zip.BlobReader(blob), options)).getEntries();
      console.log(entries.map(e => e.filename));
      const model = entries.find(e => e.filename === "model2.ldr");
      if (model) {
        console.log(model)
        const decompressedBlob = await model.getData(new zip.BlobWriter());
        console.log("extracted!");
        return decompressedBlob.text();
      }
      return "";
    } catch (e) {
      console.log(e);
      return "";
    }
  }

  createMeshes(ldrFile: string): Group {
    const ldrObjects = ldrFile.split("0 NOFILE");
    let ldrParts: LdrPart[] = [];
    console.log("Total objects in ldr:", ldrObjects.length);
    //for each object inside ldr file
    ldrObjects.forEach(ldrObject => {
      console.log(Date.now() + " iterating object...");
      let lineLdrObject = ldrObject.split("\n");

      let filename: string = "ERROR FLO";
      let isSubmodel: boolean = false;
      let isPart: boolean = false;
      let points: Vector3[] = [];
      let references: PartReference[] = [];

      //iterate all lines of ldr object
      lineLdrObject.forEach((ldrObjectLine, index) => {
        if (ldrObjectLine.endsWith("\r"))
          ldrObjectLine = ldrObjectLine.slice(0, ldrObjectLine.lastIndexOf("\r"));

        if (ldrObjectLine.startsWith("1"))
          references.push(this.parseLineTypeOne(ldrObjectLine, lineLdrObject[index - 1].includes("0 BFC INVERTNEXT")));
        else if (ldrObjectLine.startsWith("4"))
          points = points.concat(this.parseLineTypeFour(ldrObjectLine));
        else if (ldrObjectLine.startsWith("3"))
          points = points.concat(this.parseLineTypeThree(ldrObjectLine));
        else if (ldrObjectLine.startsWith("0 FILE"))
          filename = ldrObjectLine.slice(7);
        else if (ldrObjectLine.startsWith("0 IsSubModel"))
          isSubmodel = ldrObjectLine.slice(13) == 'True';
        else if (ldrObjectLine.startsWith("0 FlexibleType"))
          isPart = true;
      });
      ldrParts.push(new LdrPart(filename, isSubmodel, isPart, points, references));
    });

    console.log(Date.now() + " creating geometries..."); //assembling the parts that actually are parts (like lego)
    let trueLdrParts: LdrPart[] = ldrParts.filter(ldrPart => ldrPart.isPart);
    let meshes: Mesh[] = [];
    trueLdrParts.forEach((trueLdrPart, index) => {
      trueLdrPart.partIndex = index;
      this.resolvePartReferences(trueLdrPart, ldrParts);
      let geometry = new BufferGeometry();
      geometry.setFromPoints(trueLdrPart.points);
      geometry.computeVertexNormals();
      const material = new MeshNormalMaterial();
      //TODO set correct color
      meshes.push(new Mesh(geometry, material));
    });

    console.log(Date.now() + " total amount of meshes:", meshes.length);
    //apply submodel transforamtion and return
    return this.resolveSubmodelReferences(ldrParts[0], ldrParts, meshes);
  }

  private resolveSubmodelReferences(submodel: LdrPart, submodels: LdrPart[], meshes: Mesh[]): Group {
    let submodelMeshGroup = new Group();
    if (submodel.isSubmodel) {
      //if isSubmodel resolve submodel/part references
      console.log("Now looking at submodel:", submodel.name);
      submodel.references.forEach(submodelReference => {
        let matchingSubmodel: LdrPart[] = submodels.filter(submodelSearch => submodelSearch.name.toLowerCase() == submodelReference.name.toLowerCase());
        if (matchingSubmodel.length == 1) {
          if (!matchingSubmodel[0].isPart) { //if matchingSubmodel[0] is not resolved already resolve (recursion)
            let submodelGroup = this.resolveSubmodelReferences(matchingSubmodel[0], submodels, meshes).clone();
            submodelGroup.applyMatrix4(submodelReference.transformMatrix);
            submodelMeshGroup.add(submodelGroup);
          } else {
            console.log("The submodel reference has a tranformationmatrix of:", submodelReference.transformMatrix);
            let partMesh = meshes[matchingSubmodel[0].partIndex].clone();
            console.log("part before rotation:", partMesh.matrix);
            console.log("part before rotation:", partMesh.rotation.x, partMesh.rotation.y, partMesh.rotation.z);
            partMesh.applyMatrix4(submodelReference.transformMatrix);
            console.log("part after rotation:", partMesh.matrix);
            console.log("part after rotation:", partMesh.rotation.x, partMesh.rotation.y, partMesh.rotation.z);
            submodelMeshGroup.add(partMesh);
          }
        } else {
          console.log("Error: a submodel has a reference where mutliple or no submodels fit to:", submodelReference.name);
        }
      });
    } else {
      console.log("Error: Called the resolveSubmodelReference on a non submodel:", submodel.name);
    }
    return submodelMeshGroup;
  }

  private resolvePartReferences(part: LdrPart, parts: LdrPart[]): void {
    if (!part.isResolved) {
      part.references.forEach(partReference => {
        let matchingLdrParts: LdrPart[] = parts.filter(partSearch => partSearch.name.toLowerCase() == partReference.name.toLowerCase());
        if (matchingLdrParts.length == 1) {
          //if matchingLdrParts[0] is not resolved already resolve (recursion)
          if (!matchingLdrParts[0].isResolved) {
            this.resolvePartReferences(matchingLdrParts[0], parts);
          }
          //take transform matrix from partReference, multiply is with points of matchingLdrParts[0] to get the transformed ones and add to part.points
          matchingLdrParts[0].points.forEach(point => {
            let pointVector4: Vector4 = new Vector4(point.x, point.y, point.z, 1);

            pointVector4 = pointVector4.applyMatrix4(partReference.transformMatrix);
            /*if (partReference.invert) {
              let temp = pointVector4.y;
              pointVector4.y = pointVector4.z;
              pointVector4.z = temp;
            }*/
            if (!part.isSubmodel)
              part.points.push(new Vector3(pointVector4.x, pointVector4.y, pointVector4.z));

          });
        } else {
          console.log("Error: a part has a reference where mutliple or no parts fit to", partReference.name);
        }
      });
      part.isResolved = true;
    }
  }

  private parseLineTypeOne(line: string, invert: boolean): PartReference {
    const splittedLine = this.splitter(line, " ", 14);
    let transform = new Matrix4();
    transform.set(
      parseFloat(splittedLine[5]), parseFloat(splittedLine[8]), parseFloat(splittedLine[11]), parseFloat(splittedLine[2]),
      parseFloat(splittedLine[6]), parseFloat(splittedLine[9]), parseFloat(splittedLine[12]), parseFloat(splittedLine[3]),
      parseFloat(splittedLine[7]), parseFloat(splittedLine[10]), parseFloat(splittedLine[13]), parseFloat(splittedLine[4]),
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

  //TODO
  private parseLineTypeTwo(line: string) {
    let splitLine = line.split(" ");
  }

  private parseLineTypeThree(line: string): Vector3[] {
    let splitLine = line.split(" ");
    if (splitLine.length < 10) {
      throw "Triangle with too few coordinates";
    }
    return [
      new Vector3(parseFloat(splitLine[2]), parseFloat(splitLine[3]), parseFloat(splitLine[4])),
      new Vector3(parseFloat(splitLine[5]), parseFloat(splitLine[6]), parseFloat(splitLine[7])),
      new Vector3(parseFloat(splitLine[8]), parseFloat(splitLine[9]), parseFloat(splitLine[10])),

      new Vector3(parseFloat(splitLine[4]), parseFloat(splitLine[3]), parseFloat(splitLine[2])),
      new Vector3(parseFloat(splitLine[7]), parseFloat(splitLine[6]), parseFloat(splitLine[5])),
      new Vector3(parseFloat(splitLine[10]), parseFloat(splitLine[9]), parseFloat(splitLine[8])),
    ];
  }

  private parseLineTypeFour(line: string): Vector3[] {
    let splitLine = line.split(" ");
    if (splitLine.length < 10) {
      throw "Rectangle with too few coordinates";
    }
    return [
      new Vector3(parseFloat(splitLine[2]), parseFloat(splitLine[3]), parseFloat(splitLine[4])),
      new Vector3(parseFloat(splitLine[5]), parseFloat(splitLine[6]), parseFloat(splitLine[7])),
      new Vector3(parseFloat(splitLine[8]), parseFloat(splitLine[9]), parseFloat(splitLine[10])),

      new Vector3(parseFloat(splitLine[8]), parseFloat(splitLine[9]), parseFloat(splitLine[10])),
      new Vector3(parseFloat(splitLine[11]), parseFloat(splitLine[12]), parseFloat(splitLine[13])),
      new Vector3(parseFloat(splitLine[2]), parseFloat(splitLine[3]), parseFloat(splitLine[4])),

      new Vector3(parseFloat(splitLine[8]), parseFloat(splitLine[9]), parseFloat(splitLine[10])),
      new Vector3(parseFloat(splitLine[5]), parseFloat(splitLine[6]), parseFloat(splitLine[7])),
      new Vector3(parseFloat(splitLine[2]), parseFloat(splitLine[3]), parseFloat(splitLine[4])),

      new Vector3(parseFloat(splitLine[2]), parseFloat(splitLine[3]), parseFloat(splitLine[4])),
      new Vector3(parseFloat(splitLine[11]), parseFloat(splitLine[12]), parseFloat(splitLine[13])),
      new Vector3(parseFloat(splitLine[8]), parseFloat(splitLine[9]), parseFloat(splitLine[10])),
    ];
  }

  //TODO
  private parseLineTypeFive(line: string) {
    let splitLine = line.split(" ");
  }
}
