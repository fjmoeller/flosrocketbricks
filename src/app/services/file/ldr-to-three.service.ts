import { Injectable } from '@angular/core';
import {
  Box3,
  BufferGeometry,
  Group,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Material,
  Matrix3,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Vector3
} from 'three';
import { LdrPart, LdrSubmodel, PartReference } from '../../model/ldrawParts';
import { LdrawColorService } from '../color/ldraw-color.service';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BehaviorSubject, Observable } from 'rxjs';
import {environment} from "../../../environments/environment";

@Injectable({
  providedIn: 'root'
})
export class LdrToThreeService {

  public readonly RENDER_PLACEHOLDER_COLORED_PARTS: boolean = false;

  public ENABLE_FLAT_SHADING: boolean = true;
  public ENABLE_SHADOWS: boolean = false;

  private allPartsMap: Map<string, LdrPart> = new Map<string, LdrPart>();
  private colorToMaterialMap = new Map<number, Material>();
  private lineMaterials = [new LineBasicMaterial({ color: this.ldrawColorService.getHexColorFromLdrawColorId(71) }), new LineBasicMaterial({ color: this.ldrawColorService.getHexColorFromLdrawColorId(0) })];
  private partNameToBufferedGeometryMap = new Map<string, BufferGeometry>();
  private partNameToLineGeometryMap = new Map<string, BufferGeometry>();
  private partNameToColorBufferedGeometryMap = new Map<string, Map<number, BufferGeometry>>(); //TODO-> put into part maybe?  -> nah, but clean up ldrpart
  private instancePartRefs: { mainColor: number, partName: string, transform: Matrix4 }[] = [];
  private multiColorPartRefs: { mainColor: number, partName: string, transform: Matrix4 }[] = [];

  private loadingSubject = new BehaviorSubject<string>('Loading');
  loadingState: Observable<string> = this.loadingSubject.asObservable();

  constructor(private ldrawColorService: LdrawColorService) {
  }

  async getModel(ioUrl: string, placeHolderColor: string): Promise<Group> {
    this.loadingSubject.next("Downloading Ldr File");
    const ldrUrl = ioUrl.slice(0, ioUrl.length - 2) + "ldr"
    const contents = await fetch(environment.backendFetchUrl + ldrUrl);
    this.loadingSubject.next("Creating Mesh");
    const moc = this.createMocGroup(await contents.text(), placeHolderColor);
    this.cleanUp();
    this.loadingSubject.next("Preparing Scene");
    return moc;
  }

  private cleanUp() {
    this.allPartsMap.clear();
    this.colorToMaterialMap.clear();
    this.partNameToBufferedGeometryMap.clear();
    this.partNameToLineGeometryMap.clear();
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
        } else console.error("FRB submodel with name %s not found", reference.name);
      });
    } else { // only one submodel will be used with everything in it
      this.collectPartRefs(submodels.topLdrSubmodel, submodels.submodelMap, new Matrix4());

      //instance parts and add them to the group
      mocGroup.add(...this.spawnPartRefs(placeholderColorCode));
    }

    //center everything
    const mocBB = new Box3().setFromObject(mocGroup);
    const center = mocBB.getCenter(new Vector3());
    for (let mocElement of mocGroup.children) {
      mocElement.position.x -= center.x;
      mocElement.position.y -= center.y;
      mocElement.position.z -= center.z;
    }
    mocGroup.scale.setScalar(0.044);
    return mocGroup;
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
      const positions = instancedMeshPositions.get(key);
      if (!positions) {
        instancedMeshPositions.set(key, [ref.transform.clone()]);
      } else positions.push(ref.transform.clone());
    });

    //for each color+partname pair create instancedmesh
    instancedMeshPositions.forEach((positions, colorPartName: string) => {
      const splitkey = colorPartName.split("###");//[0] is color [1] is partName
      if (!this.RENDER_PLACEHOLDER_COLORED_PARTS && placeholderColor === Number(splitkey[0])) return;
      const geometry = this.partNameToBufferedGeometryMap.get(splitkey[1]);
      const material = this.colorToMaterialMap.get(Number(splitkey[0]));
      const mesh = new InstancedMesh(geometry, material, positions.length);
      for (let i = 0; i < mesh.count; i++)
        mesh.setMatrixAt(i, positions[i]);
      mesh.instanceMatrix.needsUpdate = true;
      mesh.name = colorPartName;
      if (this.ENABLE_SHADOWS) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
      objects.push(mesh);

      const lineGroup = new Group();
      lineGroup.name = "line" + colorPartName;
      const lineGeometry = this.partNameToLineGeometryMap.get(splitkey[1]);
      const lineMaterial = this.getLineMaterial(Number(splitkey[0])); //TODO fill this up and change the colorid....
      const lineMesh = new LineSegments(lineGeometry, lineMaterial);
      for (let i = 0; i < positions.length; i++) {
        const segments = lineMesh.clone();
        segments.applyMatrix4(positions[i]);
        lineGroup.add(segments);
      }
      objects.push(lineGroup);
    });

    //every multicolor part will be made a group of meshes
    this.multiColorPartRefs.forEach(ref => {
      if (!this.RENDER_PLACEHOLDER_COLORED_PARTS && placeholderColor === Number(ref.mainColor)) return;

      const partGroup = new Group();
      partGroup.name = "" + ref.mainColor + ref.partName;
      const geometries = this.partNameToColorBufferedGeometryMap.get(ref.partName);
      const mainMaterial = this.colorToMaterialMap.get(ref.mainColor);
      if (geometries && mainMaterial) {
        geometries.forEach((geometry, color) => {
          let material: Material;
          if (color === 16 || color === 24 || color === -1 || color === -2) material = mainMaterial;
          else material = this.colorToMaterialMap.get(color) ?? mainMaterial;
          const mesh = new Mesh(geometry, material);
          if (this.ENABLE_SHADOWS) {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
          }
          partGroup.add(mesh);
        });
        partGroup.applyMatrix4(ref.transform);

        const lineGroup = new Group();
        lineGroup.name = "lines";
        const lineGeometry = this.partNameToLineGeometryMap.get(ref.partName);
        const lineMaterial = this.getLineMaterial(ref.mainColor);
        const lineMesh = new LineSegments(lineGeometry, lineMaterial);
        lineGroup.add(lineMesh);
        partGroup.add(lineGroup);

        objects.push(partGroup);
      } else console.error("No geometries/colors for multicolor part %s found", ref.partName);
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
        } else if (submodelLine.startsWith("0 FILE"))
          partName = submodelLine.slice(7).toLowerCase();
        else if (submodelLine.startsWith("0 Name:") && partName == "no name") //backup in case no name got set which can happen
          partName = submodelLine.slice(9).toLowerCase();
      });
      const ldrSubmodel = new LdrSubmodel(partName, references);

      if (!topSubmodelSet) {
        topLdrSubmodel = ldrSubmodel;
        topSubmodelSet = true;
      }

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
        this.mergeVertices(resolvedPart.colorIndexMap, resolvedPart.colorVertexMap, resolvedPart.colorLineVertexMap);
        if (resolvedPart.colorVertexMap.size > 1) { //if part is multi color part -> will not have an instanced mesh created
          const colorGeometryMap = new Map<number, BufferGeometry>();
          resolvedPart.colorVertexMap.forEach((vertices, color) => {
            const indices = resolvedPart.colorIndexMap.get(color) ?? [];
            if (indices) {
              const partGeometry = this.createBufferedGeometry(resolvedPart.name, vertices, indices);
              colorGeometryMap.set(color, partGeometry);
            }
            else console.error("Color %d not found: vertices exist but no face to em for part %s", color, parsedPart.name);
          });
          resolvedPart.colorLineVertexMap.forEach((vertices, color) => {
            this.partNameToLineGeometryMap.set(resolvedPart.name, this.createLineGeometry(resolvedPart.name, vertices));
          });
          this.partNameToColorBufferedGeometryMap.set(parsedPart.name, colorGeometryMap);
        } else { //if part is single color part
          this.createInstanceGeometry(resolvedPart);
        }
      }
    });
  }

  private createInstanceGeometry(part: LdrPart): void {
    if (!this.partNameToBufferedGeometryMap.has(part.name)) { //if not already exists
      part.colorVertexMap.forEach((vertices, color) => { // should only be called once
        const indices = part.colorIndexMap.get(color);
        if (!indices)
          console.error("Color not found: vertices exist but no face to em");
        else {
          this.partNameToBufferedGeometryMap.set(part.name, this.createBufferedGeometry(part.name, vertices, indices));
        }
      });
      part.colorLineVertexMap.forEach((vertices, color) => {
        this.partNameToLineGeometryMap.set(part.name, this.createLineGeometry(part.name, vertices));
      });
    }
  }

  private createBufferedGeometry(partName: string, vertices: Vector3[], indices: number[]): BufferGeometry {
    let partGeometry = new BufferGeometry();
    partGeometry.setFromPoints(vertices);
    partGeometry.setIndex(indices);

    //some parts need special attention...
    if (partName == "28192.dat") {
      partGeometry.rotateY(-Math.PI / 2);
      partGeometry.translate(-10, -24, 0);
    }
    else if (partName == "68013.dat")
      partGeometry.rotateY(-Math.PI);
    else if (partName == "70681.dat")
      partGeometry.translate(0, 0, 20);

    if (this.ENABLE_FLAT_SHADING) partGeometry = BufferGeometryUtils.mergeVertices(partGeometry, 0.1);
    partGeometry.computeBoundingBox();
    partGeometry.computeVertexNormals();
    partGeometry.normalizeNormals();

    return partGeometry;
  }

  private createLineGeometry(partName: string, vertices: Vector3[]): BufferGeometry {
    let partGeometry = new BufferGeometry();
    partGeometry.setFromPoints(vertices);

    if (partName == "28192.dat") {
      partGeometry.rotateY(-Math.PI / 2);
      partGeometry.translate(-10, -24, 0);
    }
    else if (partName == "68013.dat")
      partGeometry.rotateY(-Math.PI);
    else if (partName == "70681.dat")
      partGeometry.translate(0, 0, 20);

    if (this.ENABLE_FLAT_SHADING) partGeometry = BufferGeometryUtils.mergeVertices(partGeometry, 0.1);

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
    const colorLineVertexMap = new Map<number, Vector3[]>();
    let isCW = false;

    //Go through all lines of text and parse them
    for (let partLineIndex = 0; partLineIndex < partLines.length; partLineIndex++) {
      let partLine = partLines[partLineIndex]
      if (partLine.endsWith("\r")) //removes annoying stuff
        partLine = partLine.slice(0, partLine.lastIndexOf("\r"));
      if (partLine.startsWith("1")) { //line is a reference
        references.push(this.parseLineTypeOne(partLine, invertNext));
        invertNext = false;
        this.createMaterial(references[references.length - 1].color);
      } else if (partLine.startsWith("0 FILE")) { //line is a part name
        partName = partLine.slice(7);
        invertNext = false;
      } else if (partLine.startsWith("0 BFC INVERTNEXT")) //line enables BFC for the next line
        invertNext = true;
      else if (partLine.startsWith("0 BFC CERTIFY CW")) //line enables BFC for the next line
        isCW = true;
      else if (partLine.startsWith("3") || partLine.startsWith("4")) { //line is a triangle or rectangle
        let parsed;
        if (partLine.startsWith("3"))
          parsed = this.parseLineTypeThree(partLine, (invertNext || isCW) && !(invertNext && isCW));
        else
          parsed = this.parseLineTypeFour(partLine, (invertNext || isCW) && !(invertNext && isCW));

        this.createMaterial(parsed.color);
        const partVertices = colorVertexMap.get(parsed.color);

        const vertexIndexMap = new Map<number, number>(); //maps the old index of the vertex to the position in the colorIndexMap

        //put all vertices into partVertices and to the vertexIndexMap
        if (partVertices)  //The current part already knows this color
          for (let i = 0; i < parsed.vertices.length; i++) {
            const found = partVertices.findIndex(p => p.equals(parsed.vertices[i]));
            if (found != -1 && this.ENABLE_FLAT_SHADING) //vertex already exists
              vertexIndexMap.set(i, found);
            else { //vertex doesnt exist yet
              partVertices.push(parsed.vertices[i]);
              vertexIndexMap.set(i, partVertices.length - 1);
            }
          }
        else //The current part doesn't have the current color yet
          colorVertexMap.set(parsed.color, parsed.vertices);

        const collectedIndices: number[] = [];
        for (let i = 0; i < parsed.indices.length; i += 3) { //map all indices to their now referenced vertices
          collectedIndices.push(vertexIndexMap.get(parsed.indices[i]) ?? parsed.indices[i]);
          collectedIndices.push(vertexIndexMap.get(parsed.indices[i + 1]) ?? parsed.indices[i + 1]);
          collectedIndices.push(vertexIndexMap.get(parsed.indices[i + 2]) ?? parsed.indices[i + 2]);
        }

        const partIndices = colorIndexMap.get(parsed.color) ?? [];
        colorIndexMap.set(parsed.color, partIndices.concat(collectedIndices));

        invertNext = false;
      } else if (partLine.startsWith("2")) { //line is a line
        const parsed = this.parseLineTypeTwo(partLine);
        const entry = colorLineVertexMap.get(parsed.color) ?? [];
        colorLineVertexMap.set(parsed.color, entry.concat(parsed.points));
        invertNext = false;
      }
    }

    return new LdrPart(partName, colorVertexMap, colorIndexMap, colorLineVertexMap, references);
  }

  private mergeVertices(colorIndexMap: Map<number, number[]>, colorVertexMap: Map<number, Vector3[]>, colorLineVertexMap: Map<number, Vector3[]>) {
    if (this.ENABLE_FLAT_SHADING)  //split => merged
      return;

    for (let [color, indices] of colorIndexMap.entries()) {//for every color

      const vertices = colorVertexMap.get(color) ?? [];
      for (let face = 0; face < indices.length; face += 1) { //for every edge
        const face1index1index: number = face;
        const face1index2index: number = face + (face % 3 === 2 ? -2 : 1);
        const face1index1: number = indices[face1index1index];
        const face1index2: number = indices[face1index2index];
        const face1vertex1: Vector3 = vertices[face1index1];
        const face1vertex2: Vector3 = vertices[face1index2];

        //check if edge is a line
        let isLine = false;
        for (let lineVertices of colorLineVertexMap.values()) {
          if (!isLine)
            for (let lineVertex = 0; lineVertex < lineVertices.length; lineVertex += 2)
              if ((lineVertices[lineVertex].equals(face1vertex1) && lineVertices[lineVertex + 1].equals(face1vertex2)) ||
                (lineVertices[lineVertex].equals(face1vertex2) && lineVertices[lineVertex + 1].equals(face1vertex1))) {
                isLine = true;
                break;
              }
        }

        //if edge is not a line => find other face that uses this line => will need to be merged later
        if (!isLine) {
          //find 2nd faces edge
          let foundFace2index1: number = -1; // the index of the vertex equaling the vertex of another edge
          let foundFace2index2: number = -1;
          for (let face2 = face + 3 - (face % 3); face2 < indices.length; face2 += 1) { //for every faces edge starting from the next face
            const face2index1index: number = face2;
            const face2index2index: number = face2 + (face2 % 3 === 2 ? -2 : 1);
            const face2index1: number = indices[face2index1index];
            const face2index2: number = indices[face2index2index];
            const face2vertex1: Vector3 = vertices[face2index1];
            const face2vertex2: Vector3 = vertices[face2index2];
            if (face2vertex1.equals(face1vertex1) && face2vertex2.equals(face1vertex2) && !(face2index1 == face1index1 && face2index2 == face1index2)) { //if the vertices are the same (in values), the indices are not tho
              foundFace2index1 = face2index1;
              foundFace2index2 = face2index2;
              break;
            }
            else if (face2vertex1.equals(face1vertex2) && face2vertex2.equals(face1vertex1) && !(face2index1 == face1index2 && face2index2 == face1index1)) { //if the vertices are the same (in values), the indices are not tho
              foundFace2index1 = face2index2;
              foundFace2index2 = face2index1;
              break;
            }
          }

          if (foundFace2index1 !== -1 && foundFace2index2 !== -1) { //second face exists
            for (let index = 0; index < indices.length; index++) { //reroute all indices that also point to face1vertex1 to face2vertex1 (set them to face2index1)
              if (indices[index] === face1index1) { //TODO could maybe do index < face
                indices[index] = foundFace2index1;
              }
              if (indices[index] === face1index2) {
                indices[index] = foundFace2index2;
              }
            }
            indices[face1index1index] = foundFace2index1;
            indices[face1index2index] = foundFace2index2;
          }
        }
      }

      //remove all vertices that now are not being used anymore
      const removed: number[] = [];
      for (let vIndex: number = 0; vIndex < vertices.length; vIndex++) {
        const isUsed = indices.indexOf(vIndex);
        if (isUsed === -1) {
          for (let index = 0; index < indices.length; index++) {
            if (indices[index] > vIndex)
              indices[index]--;
          }
          vertices.splice(vIndex, 1);
          removed.push(vIndex);
        }
      }
    }
  }

  private createMaterial(color: number): void {
    if (!this.colorToMaterialMap.has(color) && color != 24 && color != 16 && color != -1 && color != -2) {
      const material = new MeshStandardMaterial();
      material.flatShading = this.ENABLE_FLAT_SHADING;
      material.setValues(this.ldrawColorService.resolveColorByLdrawColorId(color));
      this.colorToMaterialMap.set(color, material);
    }
  }

  private getLineMaterial(color: number): LineBasicMaterial {
    if (color === 0)
      return this.lineMaterials[0];
    else
      return this.lineMaterials[1];
  }

  private resolvePart(partName: string): LdrPart {
    const ldrPart = this.allPartsMap.get(partName);
    if (ldrPart && !ldrPart.isResolved) {
      //resolve Part
      ldrPart.references.forEach(partReference => {
        const referencedPart = this.allPartsMap.get(partReference.name)
        if (referencedPart) {
          this.resolvePart(partReference.name);

          const colorVertexIndexMap = new Map<number, Map<number, number>>(); //each colors indices of vertices will be different so they need to be mapped to the actual ones

          //for all colors and their vertices that the referenced part has
          referencedPart.colorVertexMap.forEach((vertices, color) => {
            let indexMap = new Map<number, number>();

            let actualPartColor = color; //a color can also be determined by above for a subPart, thats why this is to be checked here
            if (partReference.color !== 16 && partReference.color !== 24 && partReference.color !== -1 && partReference.color !== -2
              && (color === 16 || color === 24 || color === -1 || color === -2))
              actualPartColor = partReference.color;

            for (let i = 0; i < vertices.length; i++) { //transform each vertex and see if it already exists
              const transformedVertex = vertices[i].clone().applyMatrix4(partReference.transformMatrix);
              if (!ldrPart?.colorVertexMap.has(actualPartColor)) { //color not found
                ldrPart?.colorVertexMap.set(actualPartColor, [transformedVertex]);
                indexMap.set(i, i);
              }
              else if (!this.ENABLE_FLAT_SHADING || !ldrPart?.colorVertexMap.get(actualPartColor)?.find(v => v.equals(transformedVertex))) { //part not in list already (if flat shading is disabled dont go into  the else part)
                const vertices = ldrPart?.colorVertexMap.get(actualPartColor);
                if (vertices) {
                  vertices.push(transformedVertex);
                  indexMap.set(i, vertices.length - 1);
                } else throw "Part or Color not found during adding referenced parts vertices";
              } else //vertex has already been added of this color
                indexMap.set(i, ldrPart?.colorVertexMap.get(actualPartColor)?.findIndex(v => v.equals(transformedVertex)) ?? -1);
            }
            colorVertexIndexMap.set(actualPartColor, indexMap);
          });

          //add all faces (made of indices of vertices)
          referencedPart.colorIndexMap.forEach((indices, color) => {
            const newIndices: number[] = []; // this will have the mapped indices

            let actualPartColor = color; //a color can also be determined by above for a subPart, thats why this is to be checked here
            if (partReference.color !== 16 && partReference.color !== 24 && partReference.color !== -1 && partReference.color !== -2
              && (color === 16 || color === 24 || color === -1 || color === -2))
              actualPartColor = partReference.color;

            for (let i = 0; i < indices.length; i++) {
              const mappedIndex = colorVertexIndexMap.get(actualPartColor)?.get(indices[i]);
              if (mappedIndex != null)
                newIndices.push(mappedIndex);
              else
                throw "Color or index not found during adding referenced parts indices";
            }

            //if to be inverted
            if (partReference.invert)
              newIndices.reverse();

            //add indices to map
            ldrPart?.colorIndexMap.set(actualPartColor, (ldrPart?.colorIndexMap.get(actualPartColor) ?? []).concat(newIndices));
          });

          referencedPart.colorLineVertexMap.forEach((vertices, referenceColor) => {
            const transformedPoints: Vector3[] = [];
            //transform points with transformation matrix of the reference to the part
            for (const vertex of vertices)
              transformedPoints.push(vertex.clone().applyMatrix4(partReference.transformMatrix));

            if (partReference.invert)
              transformedPoints.reverse();

            //append points of referenced part to the upper part to reduce the size of render hierachy
            if (ldrPart?.colorLineVertexMap.has(referenceColor)) {
              const fullList = ldrPart?.colorLineVertexMap.get(referenceColor)?.concat(transformedPoints)
              ldrPart?.colorLineVertexMap.set(referenceColor, fullList ? fullList : []);
            } else
              ldrPart?.colorLineVertexMap.set(referenceColor, transformedPoints);
          });
        }
      });
      ldrPart.isResolved = true;
      return ldrPart;
    } else {
      if (ldrPart)
        return ldrPart;
      throw ("Error: Part could not be found: " + partName);
    }
  }

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
  parseLineTypeTwo(line: string) {
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
  parseLineTypeThree(line: string, invert: boolean) {
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
      indices: indices
    };
  }

  //This functions parses a line type four, which is a rectangle, but i just split those into two triangles
  parseLineTypeFour(line: string, invert: boolean) {
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
      indices: indices
    };
  }
}
