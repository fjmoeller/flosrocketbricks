import { Injectable } from '@angular/core';
import { BufferGeometry, Group, InstancedMesh, LineBasicMaterial, LineSegments, Material, Matrix3, Matrix4, Mesh, MeshStandardMaterial, Object3D, Vector3, Vector4 } from 'three';
import { LdrPart, LdrSubmodel, PartReference } from '../../model/ldrawParts';
import { LdrawColorService } from '../color/ldraw-color.service';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class IoFileService {

  public readonly RENDER_PLACEHOLDER_COLORED_PARTS: boolean = false;

  private allPartsMap: Map<string, LdrPart> = new Map<string, LdrPart>();
  private colorToMaterialMap = new Map<number, Material>();
  private partNameToBufferedGeometryMap = new Map<string, BufferGeometry>();
  private partNameToColorBufferedGeometryMap = new Map<string, Map<number, BufferGeometry>>(); //TODO-> put into part maybe?  -> nah, but clean up ldrpart
  private instancePartRefs: { mainColor: number, partName: string, transform: Matrix4 }[] = [];
  private multiColorPartRefs: { mainColor: number, partName: string, transform: Matrix4 }[] = [];

  private loadingState: string = "";

  public loadingStateObservable: Observable<string>;



  //base URL from where to fetch the part files to get around stuff
  private backendFetchUrl: string = "https://worker.flosrocketbackend.com/viewer/?apiurl=";

  constructor(private ldrawColorService: LdrawColorService) {
    this.loadingStateObservable = of(this.loadingState);
  }

  async getModel(ioUrl: string, placeHolderColor: string): Promise<Group> {
    this.loadingState = "Downloading Ldr File";
    const ldrUrl = ioUrl.slice(0, ioUrl.length - 2) + "ldr"
    const contents = await fetch(this.backendFetchUrl + ldrUrl);
    this.loadingState = "Creating Mesh";
    const moc = this.createMocGroup(await contents.text(), placeHolderColor);
    this.cleanUp();
    this.loadingState = "Preparing Scene";
    return moc;
  }

  private cleanUp() {
    this.allPartsMap.clear();
    this.colorToMaterialMap.clear();
    this.partNameToBufferedGeometryMap.clear();
    this.partNameToColorBufferedGeometryMap.clear();
    this.instancePartRefs = [];
    this.multiColorPartRefs = [];
  }

  //This function creates the group of meshes for use of the 3d renderer out of a ldr file
  private createMocGroup(ldrFile: string, placeHolderColor: string): Group {
    const ldrObjects = ldrFile.split("0 NOSUBMODEL"); //0 = submodels, 1 = parts

    if (ldrObjects.length != 2) {
      console.error("Error: file is formated wrong, no submodel divider found");
      return new Group();
    }

    const placeholderColorCode = this.ldrawColorService.getLdrawColorIdByColorName(placeHolderColor);

    const submodels = this.parseSubmodels(ldrObjects[0].split("0 NOFILE"));
    this.parseParts(ldrObjects[1].split("0 NOFILE"), submodels.trueParts);
    const mocGroup = new Group();
    mocGroup.name = "MOC";

    if (submodels.topLdrSubmodel.references.find(reference => reference.name.startsWith("FRB:"))) { //multiple submodels will be used
      submodels.topLdrSubmodel.references.forEach(reference => {
        const stageSubmodel = submodels.submodelMap.get(reference.name);

        if (stageSubmodel) {
          const stageSubmodelGroup = new Group();
          stageSubmodelGroup.name = stageSubmodel.name;

          this.collectPartRefs(stageSubmodel, submodels.submodelMap, new Matrix4());

          //instance parts and add them to submodelGroup
          stageSubmodelGroup.add(...this.spawnPartRefs(placeholderColorCode));
          stageSubmodelGroup.applyMatrix4(reference.transformMatrix);

          mocGroup.add(stageSubmodelGroup);
        }
        else console.error("FRB submodel with name %s not found", reference.name);
      });
      return mocGroup;
    } else { // only one submodel will be used with everything in it
      this.collectPartRefs(submodels.topLdrSubmodel, submodels.submodelMap, new Matrix4());

      //instance parts and add them to the group
      mocGroup.add(...this.spawnPartRefs(placeholderColorCode));
      return mocGroup;
    }
  }

  private collectPartRefs(submodel: LdrSubmodel, ldrSubModelMap: Map<string, LdrSubmodel>, transform: Matrix4): void {
    submodel.references.forEach(reference => {
      const matchingSubmodel: LdrSubmodel | undefined = ldrSubModelMap.get(reference.name);
      if (matchingSubmodel) {// reference is a submodel
        this.collectPartRefs(matchingSubmodel, ldrSubModelMap, transform.clone().multiply(reference.transformMatrix));
      } else {// reference is a part
        const part = this.allPartsMap.get(reference.name);
        if (part && part.colorVertexMap.size > 1) { //reference is a multi color part
          const partTransform = transform.clone().multiply(reference.transformMatrix);
          this.multiColorPartRefs.push({ mainColor: reference.color, partName: part.name, transform: partTransform });
        } else if (part && part.colorVertexMap.size === 1) { //reference is a single color part
          const partTransform = transform.clone().multiply(reference.transformMatrix);
          this.instancePartRefs.push({ mainColor: reference.color, partName: part.name, transform: partTransform });
        } else console.error("Referenced part %s from submodel %s not found in allPartsMap of size %d", reference.name, submodel.name, this.allPartsMap.size);
      }
    });
  }

  private spawnPartRefs(placeholderColor: number): Object3D[] {
    const objects: Object3D[] = []

    const instancedMeshPositions = new Map<string, Matrix4[]>();
    //Count the amount of color+partname combinations of instancePartRefs
    this.instancePartRefs.forEach(ref => {
      const key = "" + ref.mainColor + "###" + ref.partName;
      const numb = instancedMeshPositions.get(key);
      if (!numb) {
        instancedMeshPositions.set(key, [ref.transform.clone()]);
      }
      else
        numb.push(ref.transform.clone());
    });

    //for each color+partname pair create instancedmesh
    instancedMeshPositions.forEach((positions, colorPartName: string) => {
      const splitkey = colorPartName.split("###");//[0] is color [1] is partName
      if(!this.RENDER_PLACEHOLDER_COLORED_PARTS && placeholderColor === Number(splitkey[0])) return;
      const geometry = this.partNameToBufferedGeometryMap.get(splitkey[1]);
      const material = this.colorToMaterialMap.get(Number(splitkey[0]));

      const mesh = new InstancedMesh(geometry, material, positions.length);
      for (var i = 0; i < mesh.count; i++)
        mesh.setMatrixAt(i, positions[i]);
      mesh.instanceMatrix.needsUpdate = true;
      objects.push(mesh);
    });

    //every multicolor part will be made a group of meshes
    this.multiColorPartRefs.forEach(ref => {
      if(!this.RENDER_PLACEHOLDER_COLORED_PARTS && placeholderColor === Number(ref.mainColor)) return;
      
      const partGroup = new Group();
      const geometries = this.partNameToColorBufferedGeometryMap.get(ref.partName);
      const mainMaterial = this.colorToMaterialMap.get(ref.mainColor);
      if (geometries && mainMaterial) {
        geometries.forEach((geometry, color) => {
          let material: Material;
          if (color === 16 || color === 24 || color === -1 || color === -2) material = mainMaterial;
          else material = this.colorToMaterialMap.get(color) ?? mainMaterial;
          const mesh = new Mesh(geometry, material);

          //partGroup.add(mesh);

          mesh.applyMatrix4(ref.transform);
          objects.push(mesh);

        });
        partGroup.position.applyMatrix4(ref.transform);
        //objects.push(partGroup);

      }
      else console.error("No geometries/colors for multicolor part %s found", ref.partName);
    });
    return objects;
  }

  private parseSubmodels(submodels: string[]) {
    let topSubmodelSet: boolean = false;
    let topLdrSubmodel: LdrSubmodel = new LdrSubmodel("", []);
    const ldrSubModelMap = new Map<string, LdrSubmodel>();
    const trueParts: string[] = [];
    //for each submodel inside the ldr file
    submodels.forEach(submodel => {
      const submodelLines = submodel.split("\n");

      let partName: string = "no name";
      const references: PartReference[] = [];
      //iterate all lines of a ldr submodel and parse them
      submodelLines.forEach((submodelLine, index) => {
        if (submodelLine.endsWith("\r"))
          submodelLine = submodelLine.slice(0, submodelLine.lastIndexOf("\r"));
        if (submodelLine.startsWith("1")) {
          references.push(this.parseLineTypeOne(submodelLine, submodelLines[index - 1].includes("0 BFC INVERTNEXT")));
          this.createMaterial(references[references.length - 1].color);
          trueParts.push(references[references.length - 1].name);
        }
        else if (submodelLine.startsWith("0 FILE"))
          partName = submodelLine.slice(7).toLowerCase();
        else if (submodelLine.startsWith("0 Name:") && partName == "no name") //backup in case no name got set which can happen
          partName = submodelLine.slice(9).toLowerCase();
      });
      const ldrSubmodel = new LdrSubmodel(partName, references);

      if (!topSubmodelSet) { topLdrSubmodel = ldrSubmodel; topSubmodelSet = true; }

      ldrSubModelMap.set(partName, ldrSubmodel);
    });

    return { "topLdrSubmodel": topLdrSubmodel, "submodelMap": ldrSubModelMap, "trueParts": trueParts };
  }

  private parseParts(parts: string[], trueParts: string[]) {
    parts.forEach(partLines => { //for every part
      const parsedPart: LdrPart = this.parsePartLines(partLines);
      this.allPartsMap.set(parsedPart.name, parsedPart);
      if (trueParts.includes(parsedPart.name)) { //is not a subpart
        const resolvedPart = this.resolvePart(parsedPart.name); //collects all vertices in the top part, so all subparts wil be resolved
        if (resolvedPart.colorVertexMap.size > 1) { //if part is multi color part -> will not have an instanced mesh created
          const colorGeometryMap = new Map<number, BufferGeometry>();
          resolvedPart.colorVertexMap.forEach((vertices, color) => {
            const indicies = resolvedPart.colorIndexMap.get(color);
            if (!indicies)
              console.error("Color %d not found: verticies exist but no face to em for part %s", color, parsedPart.name);
            else {
              const partGeometry = this.createBufferedGeometry(resolvedPart.name, vertices, indicies);
              colorGeometryMap.set(color, partGeometry);
            }
          });
          this.partNameToColorBufferedGeometryMap.set(parsedPart.name, colorGeometryMap);
        } else { //if part is single color part
          this.createInstanceGeometry(resolvedPart);
        }
      }
    });
  }

  private createInstanceGeometry(part: LdrPart): void {
    if (this.partNameToBufferedGeometryMap.has(part.name)) { //part already has had his bufferedgeometry created
      const mapped = this.partNameToBufferedGeometryMap.get(part.name);
      if (mapped) {
        this.partNameToBufferedGeometryMap.set(part.name, mapped);
      }
    } else { //part geometry doesnt exist yet
      part.colorVertexMap.forEach((vertices, color) => { // should only be called once
        const indicies = part.colorIndexMap.get(color);
        if (!indicies)
          console.error("Color not found: verticies exist but no face to em");
        else {
          const partGeometry = this.createBufferedGeometry(part.name, vertices, indicies);
          this.partNameToBufferedGeometryMap.set(part.name, partGeometry);
        }
      });
    }
  }

  private createBufferedGeometry(partName: string, vertices: Vector3[], indicies: number[]): BufferGeometry {
    let partGeometry = new BufferGeometry();
    partGeometry.setFromPoints(vertices);

    partGeometry.setIndex(indicies);

    //some parts need special attention...
    if (partName == "28192.dat") {
      partGeometry.rotateY(-Math.PI / 2);
      partGeometry.translate(-10, -24, 0);
    }
    else if (partName == "37762.dat")
      partGeometry.translate(0, -8, 0);
    else if (partName == "68013.dat")
      partGeometry.rotateY(-Math.PI);
    else if (partName == "70681.dat")
      partGeometry.translate(0, 0, 20);

    partGeometry = BufferGeometryUtils.mergeVertices(partGeometry, 0.1);
    partGeometry.computeBoundingBox();
    partGeometry.computeVertexNormals();
    partGeometry.normalizeNormals();

    return partGeometry;
  }

  //This function parses a ldr part from text
  parsePartLines(partText: string): LdrPart {
    const partLines = partText.split("\n");

    let partName: string = "ERROR FLO";
    const references: PartReference[] = [];
    let invertNext: boolean = false;
    const colorVertexMap = new Map<number, Vector3[]>();
    const colorIndexMap = new Map<number, number[]>();
    const lineColorMap = new Map<number, Vector3[]>();
    let isCW = false;

    //Go through all lines of text and parse them
    partLines.forEach(partLine => {
      if (partLine.endsWith("\r")) //removes annoying stuff
        partLine = partLine.slice(0, partLine.lastIndexOf("\r"));
      if (partLine.startsWith("1")) { //line is a reference
        references.push(this.parseLineTypeOne(partLine, invertNext));
        invertNext = false;
        this.createMaterial(references[references.length - 1].color);
      }
      else if (partLine.startsWith("0 FILE")) { //line is a part name
        partName = partLine.slice(7);
        invertNext = false;
      }
      else if (partLine.startsWith("0 BFC INVERTNEXT")) //line enables BFC for the next line
        invertNext = true;
      else if (partLine.startsWith("0 BFC CERTIFY CW")) //line enables BFC for the next line
        isCW = true;
      else if (partLine.startsWith("3") || partLine.startsWith("4")) { //line is a triangle or rectangle
        if (partLine.startsWith("3"))
          var parsed = this.parseLineTypeThree(partLine, (invertNext || isCW) && !(invertNext && isCW));
        else
          var parsed = this.parseLineTypeFour(partLine, (invertNext || isCW) && !(invertNext && isCW));

        this.createMaterial(parsed.color);
        const partIndicies = colorIndexMap.get(parsed.color);
        const partVerticies = colorVertexMap.get(parsed.color);

        const vertexIndexMap = new Map<number, number>(); //indicies of vertices will be different so they need to be mapped to the actual ones

        //put all vertices into partVerticies and to the vertexIndexMap 
        if (partVerticies) //The current part already knows this color
          for (let i = 0; i < parsed.vertices.length; i++) {
            const found = partVerticies.findIndex(p => p.equals(parsed.vertices[i]));

            if (found != -1) //vertex already exists
              vertexIndexMap.set(i, found);
            else { //vertex doesnt exist yet
              partVerticies.push(parsed.vertices[i]);
              vertexIndexMap.set(i, partVerticies.length - 1);
            }
          }
        else //The current part doesnt have the current color yet
          colorVertexMap.set(parsed.color, parsed.vertices);

        const collectedIndices = [];
        for (let i = 0; i < parsed.indicies.length; i += 3) { //map all indicies to their now referenced verticies
          collectedIndices.push(vertexIndexMap.get(parsed.indicies[i]) ?? parsed.indicies[i]);
          collectedIndices.push(vertexIndexMap.get(parsed.indicies[i + 1]) ?? parsed.indicies[i + 1]);
          collectedIndices.push(vertexIndexMap.get(parsed.indicies[i + 2]) ?? parsed.indicies[i + 2]);
        }
        colorIndexMap.set(parsed.color, (partIndicies ?? []).concat(collectedIndices));

        invertNext = false;
      }
      else if (partLine.startsWith("2")) { //line is a line
        const parsed = this.parseLineTypeTwo(partLine);
        const entry = lineColorMap.get(parsed.color) ?? [];
        lineColorMap.set(parsed.color, entry.concat(parsed.points));
        invertNext = false;
      }
    });

    return new LdrPart(partName, colorVertexMap, colorIndexMap, lineColorMap, references);
  }

  private createMaterial(colorNumber: number): void {
    if (!this.colorToMaterialMap.has(colorNumber) && colorNumber != 24 && colorNumber != 16 && colorNumber != -1 && colorNumber != -2) {
      const material = new MeshStandardMaterial();
      material.flatShading = true;
      material.setValues(this.ldrawColorService.resolveColorByLdrawColorId(colorNumber));
      this.colorToMaterialMap.set(colorNumber, material);
    }
  }

  private resolvePart(partName: string): LdrPart {
    const ldrPart = this.allPartsMap.get(partName);
    if (ldrPart && !ldrPart.isResolved) {
      //resolve Part
      ldrPart.references.forEach(partReference => {
        const referencedPart = this.allPartsMap.get(partReference.name)
        if (referencedPart) {
          this.resolvePart(partReference.name);

          const colorVertexIndexMap = new Map<number, Map<number, number>>(); //each colors indicies of vertices will be different so they need to be mapped to the actual ones

          //for all colors and their vertices that the referenced part has
          referencedPart.colorVertexMap.forEach((vertices, color) => {
            let indexMap = new Map<number, number>();
            for (let i = 0; i < vertices.length; i++) { //transform each vertex and see if it already exists
              let pointVector4: Vector4 = new Vector4(vertices[i].x, vertices[i].y, vertices[i].z, 1);

              pointVector4 = pointVector4.applyMatrix4(partReference.transformMatrix);

              const pointVector3 = new Vector3(pointVector4.x, pointVector4.y, pointVector4.z);

              if (ldrPart?.colorVertexMap.has(color) && !ldrPart?.colorVertexMap.get(color)?.find(v => v.equals(pointVector3))) { //part not in list already
                const newVerticies = ldrPart?.colorVertexMap.get(color);
                if (newVerticies != null) {
                  newVerticies.push(pointVector3);
                  indexMap.set(i, newVerticies.length - 1);
                }
                else
                  throw "Part or Color not found during adding referenced parts vertices";
              }
              else if (!ldrPart?.colorVertexMap.has(color)) { //color not found
                ldrPart?.colorVertexMap.set(color, [pointVector3]);
                indexMap.set(i, i);
              } else { //vertex has already been added of this color
                indexMap.set(i, ldrPart?.colorVertexMap.get(color)?.findIndex(v => v.equals(pointVector3)) ?? -1);
              }
            }
            colorVertexIndexMap.set(color, indexMap);
          });

          //add all faces (made of indices of vertices)
          referencedPart.colorIndexMap.forEach((indices, color) => {
            const newIndicies: number[] = []; // this will have the mapped indices
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
            ldrPart?.colorIndexMap.set(color, (ldrPart?.colorIndexMap.get(color) ?? []).concat(newIndicies));
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

  /* TODO
        referencedPart.lineColorMap.forEach((points, color) => { //for each color of the part an own mesh gets created
          let partGeometry = new BufferGeometry();
          partGeometry.setFromPoints(points);

          if (reference.name == "28192.dat") {
            partGeometry.rotateY(-Math.PI / 2);
            partGeometry.translate(-10, -24, 0);
          }
          else if (reference.name == "37762.dat")
            partGeometry.translate(0, -8, 0);
          else if (reference.name == "68013.dat")
            partGeometry.rotateY(-Math.PI);
          else if (reference.name == "70681.dat")
            partGeometry.translate(0, 0, 20);

          partGeometry.applyMatrix4(reference.transformMatrix);
          partGeometry = BufferGeometryUtils.mergeVertices(partGeometry, 0.1);


          let material; //TODO implement colors fully -> might have to remove resolved submodels to get color all the way to the bottom to each part that needs it
          if (color == 24 || color == 16 || color == -1 || color == -2) //those are not valid colors or mean that the color gets resolved in a submodel above, not fully implemented yet
          {
            //material = new LineBasicMaterial({ color: this.ldrawColorService.resolveColor(reference.color) });
            if (reference.color == 0)
              material = new LineBasicMaterial({ color: this.ldrawColorService.getHexColorFromLdrawColorId(71) });
            else
              material = new LineBasicMaterial({ color: this.ldrawColorService.getHexColorFromLdrawColorId(0) });
          }
          else
            material = new LineBasicMaterial({ color: this.ldrawColorService.getHexColorFromLdrawColorId(color) });
          submodelGroup.add(new LineSegments(partGeometry, material));
        });

  */

  //This functions parses a line type one, which is a reference to a part or a submodel in a ldr file
  parseLineTypeOne(line: string, invert: boolean): PartReference {
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

  //This functions parses a line type three, which is a triangle
  private parseLineTypeThree(line: string, invert: boolean) {
    const splitLine = line.split(" ");
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
    const splitLine = line.split(" ");
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
    const indices = invert ? [2, 1, 0, 3, 2, 0] : [0, 1, 2, 0, 2, 3];

    return {
      color: color,
      vertices: vertices,
      indicies: indices
    };
  }
}
