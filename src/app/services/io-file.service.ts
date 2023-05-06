import { Injectable } from '@angular/core';
import { BufferGeometry, Group, Line, LineBasicMaterial, LineSegments, Matrix3, Matrix4, Mesh, MeshStandardMaterial, Vector3, Vector4 } from 'three';
import { LdrPart, LdrSubmodel, PartReference } from './ldrawParts';
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
    let ldrSubModelMap = new Map<string, LdrSubmodel>();
    let ldrSubModelNames: string[] = [];
    //for each submodel inside the ldr file
    submodels.forEach(submodel => {
      let submodelLines = submodel.split("\n");

      let partName: string = "no name";
      let references: PartReference[] = [];
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
      let ldrSubmodel = new LdrSubmodel(partName, references);

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
    if (submodel.resolved) {
      return submodel.group;
    }
    //the group to collect all the meshes and other groups in
    let submodelGroup = new Group();

    for (const reference of submodel.references) { //this loop goes through all references to other parts/submodels inside the current submodel
      let matchingSubmodel: LdrSubmodel | undefined = ldrSubModelMap.get(reference.name);
      if (matchingSubmodel) {// reference is a submodel
        let referenceSubmodelGroup = (this.resolveSubmodel(matchingSubmodel, ldrSubModelNames, ldrSubModelMap)).clone();
        referenceSubmodelGroup.applyMatrix4(reference.transformMatrix);
        submodelGroup.add(referenceSubmodelGroup);
      } else {// reference is a part
        let referencedPart = this.resolvePart(reference.name);
        referencedPart.verticesColorMap.forEach((vertices, color) => { //for each color of the part an own mesh gets created
          let partGeometry = new BufferGeometry();
          partGeometry.setFromPoints(vertices);
          let indicies = referencedPart.indexColorMap.get(color);
          if (indicies)
            partGeometry.setIndex(indicies);
          else
            throw "Color not found: verticies exist but no face to em";

          //FIX transformation matrix for 28192
          if (reference.name == "28192.dat") {
            partGeometry = partGeometry.rotateY(-Math.PI / 2);
            partGeometry = partGeometry.translate(-10, -24, 0);
          } //FIX transformation matrix for 37762
          else if (reference.name == "37762.dat") {
            partGeometry = partGeometry.translate(0, -8, 0);
          }

          partGeometry.applyMatrix4(reference.transformMatrix);
          partGeometry.computeVertexNormals();
          partGeometry.computeBoundingBox();
          partGeometry.normalizeNormals();
          partGeometry = BufferGeometryUtils.mergeVertices(partGeometry, 0.01);

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
            partGeometry = partGeometry.rotateY(-Math.PI / 2);
            partGeometry = partGeometry.translate(-10, -24, 0);
          } //FIX transformation matrix for 37762
          else if (reference.name == "37762.dat") {
            partGeometry = partGeometry.translate(0, -8, 0);
          }

          partGeometry.applyMatrix4(reference.transformMatrix);
          partGeometry.computeVertexNormals();
          partGeometry.normalizeNormals();
          partGeometry = BufferGeometryUtils.mergeVertices(partGeometry, 0.1);

          let material; //TODO implement colors fully -> might have to remove resolved submodels to get color all the way to the bottom to each part that needs it
          if (color == 24 || color == 16 || color == -1 || color == -2) //those are not valid colors or mean that the color gets resolved in a submodel above, not fully implemented yet
            material = new LineBasicMaterial({ color: this.ldrawColorService.resolveColor(0) }); //reference.color
          else
            material = new LineBasicMaterial({ color: this.ldrawColorService.resolveColor(0) }); //color
          submodelGroup.add(new LineSegments(partGeometry, material));
        });
      }
    }
    submodel.group = submodelGroup;
    submodel.resolved = true;

    return submodelGroup;
  }

  private resolvePart(partName: string): LdrPart {
    let ldrPart = this.allPartsMap.get(partName);
    if (ldrPart && !ldrPart.isResolved) {
      //resolve references of part and add their vertices and indices to current part
      for (const partReference of ldrPart.references) {
        let referencedPart = this.allPartsMap.get(partReference.name)
        if (!referencedPart) {
          throw "Referenced Part not found during resolving!";
        }

        this.resolvePart(partReference.name);

        let colorVertexIndexMap = new Map<number, Map<number, number>>(); //for each color indicies of vertices will be different so they need to be mapped to the actual ones

        //transform and add all vertices
        referencedPart.verticesColorMap.forEach((vertices, color) => { //for each color
          let indexMap = new Map<number, number>();
          for (let i = 0; i < vertices.length; i++) { //transform each vertex and see if it already exists
            let pointVector4: Vector4 = new Vector4(vertices[i].x, vertices[i].y, vertices[i].z, 1);

            pointVector4 = pointVector4.applyMatrix4(partReference.transformMatrix);

            const pointVector3 = new Vector3(pointVector4.x, pointVector4.y, pointVector4.z);

            if (ldrPart?.verticesColorMap.has(color) && !ldrPart?.verticesColorMap.get(color)?.find(v => v.equals(pointVector3))) { //part not in list already
              const newVerticies = ldrPart?.verticesColorMap.get(color);
              if (newVerticies != null) {
                newVerticies.push(pointVector3);
                indexMap.set(i, newVerticies.length - 1);
              }
              else
                throw "Part or Color not found during adding referenced parts vertices";
            }
            else if (!ldrPart?.verticesColorMap.has(color)) { //color not found
              ldrPart?.verticesColorMap.set(color, [pointVector3]);
              indexMap.set(i, i);
            } else { //vertex has already been added of this color
              indexMap.set(i, ldrPart?.verticesColorMap.get(color)?.findIndex(v => v.equals(pointVector3)) ?? -1);
            }
          }
          colorVertexIndexMap.set(color, indexMap);
        });

        //add all faces (made of indices of vertices)
        referencedPart.indexColorMap.forEach((indices, color) => {
          let newIndicies: number[] = []; // this will have the mapped indices
          for (let i = 0; i < indices.length; i++) {
            const mappedIndex = colorVertexIndexMap.get(color)?.get(indices[i]);
            if (mappedIndex != null)
              newIndicies.push(mappedIndex);
            else
              throw "Color or index not found during adding referenced parts indices";
          }


          //if to be inverted
          if (partReference.invert)
            newIndicies.reverse();

          //add indices to map
          ldrPart?.indexColorMap.set(color, (ldrPart?.indexColorMap.get(color) ?? []).concat(newIndicies));
        });

        //add all lines
        referencedPart.lineColorMap.forEach((referencePoints, referenceColor) => {
          let transformedPoints: Vector3[] = [];
          //transform points with transformation matrix of the reference to the part
          for (const referencePoint of referencePoints) {
            let pointVector4: Vector4 = new Vector4(referencePoint.x, referencePoint.y, referencePoint.z, 1);
            pointVector4 = pointVector4.applyMatrix4(partReference.transformMatrix);
            transformedPoints.push(new Vector3(pointVector4.x, pointVector4.y, pointVector4.z));
          }
          //append points of referenced part to the upper part to reduce the size of render hierachy
          if (ldrPart?.lineColorMap.has(referenceColor)) {
            let fullList = ldrPart?.lineColorMap.get(referenceColor)?.concat(transformedPoints)
            ldrPart?.lineColorMap.set(referenceColor, fullList ? fullList : []);
          } else
            ldrPart?.lineColorMap.set(referenceColor, transformedPoints);
        });
      }
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
    let partLines = partText.split("\n");

    let partName: string = "ERROR FLO";
    let partReferences: PartReference[] = [];
    let invertNext: boolean = false;
    let partColorVertices = new Map<number, Vector3[]>();
    let partColorIndicies = new Map<number, number[]>();
    let lineColorMap = new Map<number, Vector3[]>();

    //Go through all lines of text and parse them
    partLines.forEach(partLine => {
      if (partLine.endsWith("\r")) //removes annoying stuff
        partLine = partLine.slice(0, partLine.lastIndexOf("\r"));
      if (partLine.startsWith("1")) { //line is a reference
        partReferences.push(this.parseLineTypeOne(partLine, invertNext));
        invertNext = false;
      }
      else if (partLine.startsWith("0 FILE")) { //line is a part name
        partName = partLine.slice(7);
        invertNext = false;
      }
      else if (partLine.startsWith("0 BFC INVERTNEXT")) //line enables BFC for the next line
        invertNext = true;
      else if (partLine.startsWith("3") || partLine.startsWith("4")) { //line is a triangle or rectangle
        if (partLine.startsWith("3"))
          var parsed = this.parseLineTypeThree(partLine, invertNext);
        else
          var parsed = this.parseLineTypeFour(partLine, invertNext);

        let partIndicies = partColorIndicies.get(parsed.color);
        let partVerticies = partColorVertices.get(parsed.color);

        let vertexIndexMap = new Map<number, number>(); //indicies of vertices will be different so they need to be mapped to the actual ones

        //put all vertices into partVerticies and to the vertexIndexMap 
        if (partVerticies) //The current part already knows this color
          for (let i = 0; i < parsed.vertices.length; i++) {
            let found = partVerticies.findIndex(p => p.equals(parsed.vertices[i]));

            if (found != -1) //vertex already exists
              vertexIndexMap.set(i, found);
            else {
              partVerticies.push(parsed.vertices[i]);
              vertexIndexMap.set(i, partVerticies.length - 1);
            }
          }
        else //The current part doesnt have the current color yet
          partColorVertices.set(parsed.color, parsed.vertices);

        let collectedIndices = [];
        for (let i = 0; i < parsed.indicies.length; i += 3) { //map all indicies to their now referenced verticies
          collectedIndices.push(vertexIndexMap.get(parsed.indicies[i]) ?? parsed.indicies[i]);
          collectedIndices.push(vertexIndexMap.get(parsed.indicies[i + 1]) ?? parsed.indicies[i + 1]);
          collectedIndices.push(vertexIndexMap.get(parsed.indicies[i + 2]) ?? parsed.indicies[i + 2]);
        }
        partColorIndicies.set(parsed.color, (partIndicies ?? []).concat(collectedIndices));

        invertNext = false;
      }
      else if (partLine.startsWith("2")) { //line is a line
        let parsed = this.parseLineTypeTwo(partLine);
        let entry = lineColorMap.get(parsed.color);
        entry == undefined ? entry = [] : undefined;
        lineColorMap.set(parsed.color, entry.concat(parsed.vertices));
        invertNext = false;
      }
    });

    return new LdrPart(partName, partColorVertices, partColorIndicies, lineColorMap, partReferences);
  }

  //This functions parses a line type one, which is a reference to a part or a submodel in a ldr file
  private parseLineTypeOne(line: string, invert: boolean): PartReference {
    const splittedLine = this.splitter(line, " ", 14);
    let transform = new Matrix4();

    transform.set(
      parseFloat(splittedLine[5]), parseFloat(splittedLine[6]), parseFloat(splittedLine[7]), parseFloat(splittedLine[2]),
      parseFloat(splittedLine[8]), parseFloat(splittedLine[9]), parseFloat(splittedLine[10]), parseFloat(splittedLine[3]),
      parseFloat(splittedLine[11]), parseFloat(splittedLine[12]), parseFloat(splittedLine[13]), parseFloat(splittedLine[4]),
      0, 0, 0, 1
    );

    let determinantMatrix = new Matrix3();
    determinantMatrix.set(parseFloat(splittedLine[5]), parseFloat(splittedLine[6]), parseFloat(splittedLine[7]), parseFloat(splittedLine[8]), parseFloat(splittedLine[9]), parseFloat(splittedLine[10]), parseFloat(splittedLine[11]), parseFloat(splittedLine[12]), parseFloat(splittedLine[13]));
    let determinant = determinantMatrix.determinant();

    invert = determinant > 0 ? invert : !invert;

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
    let splitLine = line.split(" ");
    if (splitLine.length < 8) {
      throw "line with too few coordinates";
    }

    return {
      color: parseInt(splitLine[1]),
      vertices: [
        new Vector3(parseFloat(splitLine[2]), parseFloat(splitLine[3]), parseFloat(splitLine[4])),
        new Vector3(parseFloat(splitLine[5]), parseFloat(splitLine[6]), parseFloat(splitLine[7]))
      ]
    }
  }

  //This functions parses a line type three, which is a triangle
  private parseLineTypeThree(line: string, invert: boolean) {
    let splitLine = line.split(" ");
    if (splitLine.length < 10) {
      throw "Triangle with too few coordinates";
    }
    const color = parseInt(splitLine[1]);
    const vertices = [
      new Vector3(parseFloat(splitLine[2]), parseFloat(splitLine[3]), parseFloat(splitLine[4])),
      new Vector3(parseFloat(splitLine[5]), parseFloat(splitLine[6]), parseFloat(splitLine[7])),
      new Vector3(parseFloat(splitLine[8]), parseFloat(splitLine[9]), parseFloat(splitLine[10]))
    ];
    const indices = invert ? [2, 1, 0] : [0, 1, 2];

    return {
      color: color,
      vertices: vertices,
      indicies: indices
    };
  }

  //This functions parses a line type four, which is a rectangle, but i just split those into two triangles
  private parseLineTypeFour(line: string, invert: boolean) {
    let splitLine = line.split(" ");
    if (splitLine.length < 13) {
      throw "Rectangle with too few coordinates";
    }

    const color = parseInt(splitLine[1]);
    const vertices = [
      new Vector3(parseFloat(splitLine[2]), parseFloat(splitLine[3]), parseFloat(splitLine[4])),
      new Vector3(parseFloat(splitLine[5]), parseFloat(splitLine[6]), parseFloat(splitLine[7])),
      new Vector3(parseFloat(splitLine[8]), parseFloat(splitLine[9]), parseFloat(splitLine[10])),
      new Vector3(parseFloat(splitLine[11]), parseFloat(splitLine[12]), parseFloat(splitLine[13]))
    ];
    const indices = invert ? [2, 1, 0, 0, 3, 2] : [0, 1, 2, 2, 3, 0];

    return {
      color: color,
      vertices: vertices,
      indicies: indices
    };
  }

  private invertGeometry(geometry: BufferGeometry) {
    if (geometry.index) {
      const index = geometry.index.array;
      const reversedIndex = [];
      for (let i = 0, il = index.length / 3; i < il; i++) {
        let x = index[i * 3]
        reversedIndex[i * 3] = index[i * 3 + 2]
        reversedIndex[i * 3 + 2] = x
      }
      geometry.setIndex(reversedIndex);
      geometry.index.needsUpdate = true;
    }
  }
}
