import {Injectable} from '@angular/core';
import {
  Box3,
  BufferGeometry,
  Group,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Material,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Vector3
} from 'three';
import {LdrPart, LdrSubmodel, PartReference} from '../../model/ldrawParts';
import {LdrawColorService} from '../color/ldraw-color.service';
import {BehaviorSubject, Observable} from 'rxjs';
import {environment} from "../../../environments/environment";
import {
  parseLineTypeThree,
  parseLineTypeTwo,
  parseLineTypeFour,
  parseLineTypeOne,
  mergeVertices, resolvePart, createBufferGeometry, createLineGeometry, mergeLowAngleVertices
} from "../../utils/ldrUtils";

@Injectable({
  providedIn: 'root'
})
export class LdrToThreeService {

  public readonly RENDER_PLACEHOLDER_COLORED_PARTS: boolean = false;

  public ENABLE_FLAT_SHADING: boolean = false;
  public ENABLE_SHADOWS: boolean = false;
  private MERGE_THRESHOLD: number = 39;
  public ENABLE_PART_LINES: boolean = true;

  private allPartsMap: Map<string, LdrPart> = new Map<string, LdrPart>();
  private colorToMaterialMap = new Map<number, Material>();
  private lineMaterials = [new LineBasicMaterial({color: this.ldrawColorService.getHexColorFromLdrawColorId(71)}), new LineBasicMaterial({color: this.ldrawColorService.getHexColorFromLdrawColorId(0)})];
  private partNameToBufferedGeometryMap = new Map<string, BufferGeometry>();
  private partNameToLineGeometryMap = new Map<string, BufferGeometry>();
  private partNameToColorBufferedGeometryMap = new Map<string, Map<number, BufferGeometry>>(); //TODO-> put into part maybe?  -> nah, but clean up ldrpart
  private instancePartRefs: { mainColor: number, partName: string, transform: Matrix4 }[] = [];
  private multiColorPartRefs: { mainColor: number, partName: string, transform: Matrix4 }[] = [];

  private loadingSubject = new BehaviorSubject<string>('Loading');
  loadingState: Observable<string> = this.loadingSubject.asObservable();

  constructor(private ldrawColorService: LdrawColorService) {
  }

  async getModel(ioUrl: string, placeHolderColor: string, viewerVersion: string): Promise<Group> {
    this.loadingSubject.next("Downloading Ldr File");
    const ldrUrl = ioUrl.slice(0, ioUrl.length - 2) + "ldr"
    const contents = await fetch(environment.backendFetchUrl + ldrUrl);
    this.loadingSubject.next("Creating Mesh");
    const moc = this.createMocGroup(await contents.text(), placeHolderColor, viewerVersion);
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
  private createMocGroup(ldrFile: string, placeHolderColor: string, viewerVersion: string): Group {
    const ldrObjects = ldrFile.split("0 NOSUBMODEL"); //0 = submodels, 1 = parts

    if (ldrObjects.length != 2) {
      console.error("Error: file is formated wrong, no submodel divider found");
      return new Group();
    }

    const placeholderColorCode = this.ldrawColorService.getLdrawColorIdByColorName(placeHolderColor);

    const submodels = this.parseSubmodels(ldrObjects[0].split("0 NOFILE"));
    this.parseParts(ldrObjects[1].split("0 NOFILE"), submodels.trueParts, viewerVersion);
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
          this.multiColorPartRefs.push({mainColor: reference.color, partName: part.id, transform: partTransform});
        } else if (part && part.colorVertexMap.size === 1) { //reference is a single color part
          const partTransform = transform.clone().multiply(reference.transformMatrix);
          this.instancePartRefs.push({mainColor: reference.color, partName: part.id, transform: partTransform});
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

      let submodelName: string = "no name";
      const references: PartReference[] = [];
      //iterate all lines of a ldr submodel and parse them
      submodelLines.forEach((submodelLine, index) => {
        if (submodelLine.endsWith("\r"))
          submodelLine = submodelLine.slice(0, submodelLine.lastIndexOf("\r"));
        if (submodelLine.startsWith("1")) {
          references.push(parseLineTypeOne(submodelLine, submodelLines[index - 1].includes("0 BFC INVERTNEXT")));
          this.createMaterialIfNotExists(references[references.length - 1].color);
          trueParts.push(references[references.length - 1].name);
        } else if (submodelLine.startsWith("0 FILE"))
          submodelName = submodelLine.slice(7).toLowerCase();
        else if (submodelLine.startsWith("0 Name:") && submodelName == "no name") //backup in case no name got set which can happen
          submodelName = submodelLine.slice(9).toLowerCase();
      });
      const ldrSubmodel = new LdrSubmodel(submodelName, references);

      if (!topSubmodelSet) {
        topLdrSubmodel = ldrSubmodel;
        topSubmodelSet = true;
      }

      ldrSubModelMap.set(submodelName, ldrSubmodel);
    });

    return {"topLdrSubmodel": topLdrSubmodel, "submodelMap": ldrSubModelMap, "trueParts": trueParts};
  }

  private parseParts(parts: string[], trueParts: string[], viewerVersion: string) {
    parts.forEach(partLines => { //for every part
      const parsedPart: LdrPart = this.parsePartLines(partLines);
      this.allPartsMap.set(parsedPart.id, parsedPart);
      if (trueParts.includes(parsedPart.id)) { //is not a subpart
        const resolvedPart = resolvePart(parsedPart.id, this.allPartsMap, {flatShading: this.ENABLE_FLAT_SHADING}); //collects all vertices in the top part, so all subparts wil be resolved

        if (this.ENABLE_FLAT_SHADING)
          mergeVertices(resolvedPart.colorIndexMap, resolvedPart.colorVertexMap, resolvedPart.colorLineVertexMap);
        else
          mergeLowAngleVertices(resolvedPart.colorIndexMap, resolvedPart.colorVertexMap, this.MERGE_THRESHOLD);

        if (resolvedPart.colorVertexMap.size > 1) { //if part is multi color part -> will not have an instanced mesh created
          const colorGeometryMap = new Map<number, BufferGeometry>();
          resolvedPart.colorVertexMap.forEach((vertices, color) => {
            const indices = resolvedPart.colorIndexMap.get(color) ?? [];
            if (indices) {
              const partGeometry = createBufferGeometry(resolvedPart.id, vertices, indices, viewerVersion, this.ENABLE_FLAT_SHADING);
              colorGeometryMap.set(color, partGeometry);
            } else console.error("Color %d not found: vertices exist but no face to em for part %s", color, parsedPart.id);
          });
          resolvedPart.colorLineVertexMap.forEach((vertices, color) => {
            this.partNameToLineGeometryMap.set(resolvedPart.id, createLineGeometry(resolvedPart.id, vertices, viewerVersion, this.ENABLE_FLAT_SHADING));
          });
          this.partNameToColorBufferedGeometryMap.set(parsedPart.id, colorGeometryMap);
        } else { //if part is single color part
          this.createInstanceGeometry(resolvedPart, viewerVersion);
        }
      }
    });
  }

  private createInstanceGeometry(part: LdrPart, viewerVersion: string): void {
    if (!this.partNameToBufferedGeometryMap.has(part.id)) { //if not already exists
      part.colorVertexMap.forEach((vertices, color) => { // should only be called once
        const indices = part.colorIndexMap.get(color);
        if (!indices)
          console.error("Color not found: vertices exist but no face for em");
        else {
          this.partNameToBufferedGeometryMap.set(part.id, createBufferGeometry(part.id, vertices, indices, viewerVersion, this.ENABLE_FLAT_SHADING));
        }
      });
      part.colorLineVertexMap.forEach((vertices, color) => {
        this.partNameToLineGeometryMap.set(part.id, createLineGeometry(part.id, vertices, viewerVersion, this.ENABLE_FLAT_SHADING));
      });
    }
  }

  //This function parses a ldr part from text
  private parsePartLines(partText: string): LdrPart {
    const partLines = partText.split("\n");

    let partId: string = "ERROR FLO";
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
        references.push(parseLineTypeOne(partLine, invertNext));
        invertNext = false;
        this.createMaterialIfNotExists(references[references.length - 1].color);
      } else if (partLine.startsWith("0 FILE")) { //line is a part name
        partId = partLine.slice(7);
        invertNext = false;
      } else if (partLine.startsWith("0 ") && partName === "ERROR FLO" && partId != "ERROR FLO") { //line is a part name
        partName = partLine.slice(2).trim().replace("  ", " ");
        invertNext = false;
      } else if (partLine.startsWith("0 BFC INVERTNEXT")) //line enables BFC for the next line
        invertNext = true;
      else if (partLine.startsWith("0 BFC CERTIFY CW")) //line enables BFC for the next line
        isCW = true;
      else if (partLine.startsWith("3") || partLine.startsWith("4")) { //line is a triangle or rectangle
        let parsed;
        if (partLine.startsWith("3"))
          parsed = parseLineTypeThree(partLine, (invertNext || isCW) && !(invertNext && isCW));
        else
          parsed = parseLineTypeFour(partLine, (invertNext || isCW) && !(invertNext && isCW));

        this.createMaterialIfNotExists(parsed.color);
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
      }
      else if (partLine.startsWith("2") && this.ENABLE_PART_LINES) { //line is a line
        const parsed = parseLineTypeTwo(partLine);
        const entry = colorLineVertexMap.get(parsed.color) ?? [];
        colorLineVertexMap.set(parsed.color, entry.concat(parsed.points));
        //TODO move this out?
        invertNext = false;
      }
    }

    return new LdrPart(partId, partName, colorVertexMap, colorIndexMap, colorLineVertexMap, references);
  }

  private createMaterialIfNotExists(color: number): void {
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
}
