import {Injectable} from '@angular/core';
import {
  BufferGeometry, Color, Group, LineBasicMaterial, LineSegments, Material, Mesh,
  MeshStandardMaterial, Vector3
} from "three";
import {LdrawColorService} from "../color/ldraw-color.service";
import {
  InstructionModel, InstructionPart, InstructionPartReference, InstructionStep,
  InstructionSubmodel, InstructionSubmodelReference, StepModel, StepPart
} from "../../model/instructions";
import {LdrPart, PartReference} from "../../model/ldrawParts";
import {Box3} from "three/src/math/Box3.js";
import {
  parseLineTypeFour,
  parseLineTypeThree,
  parseLineTypeOne,
  parseLineTypeTwo,
  resolvePart,
  createLineGeometry,
  createBufferGeometry,
  bevelPart,
  mergeVertices,
  shrinkPartScale,
  mergeLowAngleVertices
} from "../../utils/ldrUtils";
import JSZip from "jszip";
import {environment} from "../../../environments/environment";

@Injectable({
  providedIn: 'root'
})
export class InstructionService {

  private readonly DEFAULT_PREV_INTERPOLATION_COLOR = new Color(0.344, 0.394, 0.457);
  private readonly DEFAULT_PREV_INTERPOLATION_PERCENTAGE: number = 0.7;

  private PREV_INTERPOLATION_COLOR = this.DEFAULT_PREV_INTERPOLATION_COLOR;
  private PREV_INTERPOLATION_PERCENTAGE: number = this.DEFAULT_PREV_INTERPOLATION_PERCENTAGE;

  private ENABLE_FLAT_SHADING: boolean = false;
  private MERGE_THRESHOLD: number = 39;
  private ENABLE_SHRINKING: boolean = false;
  private SHRINKING_GAP_SIZE: number = 0.1;
  private ENABLE_BEVEL: boolean = false;
  private BEVEL_SIZE: number = 0.1;
  private BEVEL_THRESHOLD: number = 85;
  private ENABLE_PART_LINES: boolean = true;
  private ENABLE_SHADOWS: boolean = false;

  //Because there are only two possible lineColors I just initialize them here :)
  private lineMaterials = [new LineBasicMaterial({color: this.ldrawColorService.getHexColorFromLdrawColorId(71)}), new LineBasicMaterial({color: this.ldrawColorService.getHexColorFromLdrawColorId(0)})];
  private prevLineMaterials = [new LineBasicMaterial({color: this.ldrawColorService.getHexColorFromLdrawColorId(71)}), new LineBasicMaterial({color: this.ldrawColorService.getHexColorFromLdrawColorId(0)})];

  constructor(private ldrawColorService: LdrawColorService) {
  }

  async getInstructionModel(fileLink: string, instructionVersion: string, prevInterpolationColor?: Color, prevInterpolationPercentage?: number, defaultAnyColor?: Color): Promise<InstructionModel> {
    //load defaults from localstorage if existing
    if (prevInterpolationColor !== undefined) this.PREV_INTERPOLATION_COLOR = prevInterpolationColor;
    else this.PREV_INTERPOLATION_COLOR = this.DEFAULT_PREV_INTERPOLATION_COLOR;
    if (prevInterpolationPercentage !== undefined) this.PREV_INTERPOLATION_PERCENTAGE = prevInterpolationPercentage;
    else this.PREV_INTERPOLATION_PERCENTAGE = this.DEFAULT_PREV_INTERPOLATION_PERCENTAGE;

    let contents;
    if (instructionVersion === "V1" || instructionVersion === "V2") {
      const fileName = fileLink.slice(0, fileLink.length - 2) + "ldr"
      contents = await (await fetch(environment.backendFetchUrl + fileName)).text();
      //contents = await (await fetch("assets/Cygnus_XL_V1.0.ldr")).text();
    } else {
      const response = await fetch(environment.backendFetchUrl + fileLink);
      //const response = await fetch("assets/Cygnus_XL_V1.0.io");
      const arrayBuffer = await response.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      const file = zip.file('model2.ldr');
      if (file) {
        contents = await file.async('text');
      } else {
        contents = "";
      }
    }

    return this.createInstructionModel(contents, instructionVersion, defaultAnyColor);
  }

  private createInstructionModel(ldrFileContent: string, instructionVersion: string, defaultAnyColor?: Color): InstructionModel {
    //init
    const instructionModel: InstructionModel = {
      instructionSteps: [],
      parts: new Map<string, InstructionPart>(),
      submodels: new Map<string, InstructionSubmodel>(),
      ldrData: {
        allPartsMap: new Map<string, LdrPart>(),
        colorToMaterialMap: new Map<number, Material>(),
        colorToPrevMaterialMap: new Map<number, Material>(),
        idToGeometryMap: new Map<string, BufferGeometry>(), // geometries for normal parts
        idToColorGeometryMap: new Map<string, Map<number, BufferGeometry>>(), // geometries for multicolor parts (like printed ones)
        idToLineGeometryMap: new Map<string, BufferGeometry>()
      }
    };
    let topSubmodel: string = "";

    //Parsing parts and submodels
    const allObjects = ldrFileContent.split("0 NOFILE");
    const referenceNames: string[] = []; //a list of all the names of referenced parts and submodels
    for (let objectIndex = 0; objectIndex < allObjects.length; objectIndex++) {
      const objectLines = allObjects[objectIndex].split("\n");

      //if it's empty, then skip it
      let empty = true;
      for (let j = 0; j < objectLines.length && empty; j++)
        empty = objectLines[j].trim() === "";
      if (empty) continue;

      //find out if it's a submodel or a part
      let isSubmodel = true;
      for (let j = 0; j < objectLines.length; j++)
        if (objectLines[j].startsWith("0 FILE"))
          isSubmodel = !objectLines[j].includes(".dat")

      if (isSubmodel) {
        //parse as submodel
        //if it's empty, then skip it
        let empty = true;
        for (let j = 0; j < objectLines.length; j++)
          if (objectLines[j].trim() != "") {
            empty = false;
            break;
          }
        if (empty) continue;

        let submodelName: string = "";
        const stepReferences: PartReference[][] = [];
        stepReferences.push([]);
        let stepCounter = 0;

        for (let j = 0; j < objectLines.length; j++) {
          const submodelLine = objectLines[j].trim();
          if (submodelLine.startsWith("1")) {
            const createdReference = parseLineTypeOne(submodelLine, objectLines[j - 1].includes("0 BFC INVERTNEXT"));
            stepReferences[stepCounter].push(createdReference);
            this.createMaterialIfNotExists(createdReference.color, instructionModel.ldrData.colorToMaterialMap, instructionModel.ldrData.colorToPrevMaterialMap, defaultAnyColor);
            if (!referenceNames.includes(createdReference.name))
              referenceNames.push(createdReference.name);
          } else if (submodelLine.startsWith("0 STEP")) {
            stepCounter++;
            stepReferences.push([]);
          } else if (submodelLine.startsWith("0 FILE")) {
            submodelName = submodelLine.slice(7).toLowerCase();
          } else if (submodelLine.startsWith("0 Name:") && submodelName === ""){ //backup in case no name got set which can happen
            submodelName = submodelLine.slice(9).toLowerCase();
          }
        }

        //remove last step if it's completely empty
        if (stepReferences.length > 0 && stepReferences[stepReferences.length - 1].length === 0)
          stepReferences.pop();

        instructionModel.submodels.set(submodelName, {
          name: submodelName,
          stepReferences: stepReferences,
          group: new Group(),
          prevGroup: new Group()
        });

        //remember which one the first submodel is
        if (topSubmodel === "") topSubmodel = submodelName;

      } else {
        //parse as part
        const parsedPart: LdrPart = this.parsePartLines(objectLines, instructionModel.ldrData.colorToMaterialMap, instructionModel.ldrData.colorToPrevMaterialMap, defaultAnyColor);
        instructionModel.ldrData.allPartsMap.set(parsedPart.id, parsedPart);
      }
    }

    //resolve parts
    for (let referencedName of referenceNames) {
      if (!instructionModel.ldrData.allPartsMap.has(referencedName))
        continue; //skip submodels, they will be resolved later

      const resolvedPart = resolvePart(referencedName, instructionModel.ldrData.allPartsMap, {flatShading: this.ENABLE_FLAT_SHADING}); //collects all vertices in the top part, so all subparts wil be resolved

      if (this.ENABLE_FLAT_SHADING)
        mergeVertices(resolvedPart.colorIndexMap, resolvedPart.colorVertexMap, resolvedPart.colorLineVertexMap);
      else
        mergeLowAngleVertices(resolvedPart.colorIndexMap, resolvedPart.colorVertexMap, this.MERGE_THRESHOLD);

      if (this.ENABLE_SHRINKING)
        shrinkPartScale(resolvedPart, this.SHRINKING_GAP_SIZE);

      if (this.ENABLE_BEVEL)
        bevelPart(resolvedPart, this.BEVEL_SIZE, this.BEVEL_THRESHOLD);

      if (resolvedPart.colorVertexMap.size > 1) { //if part is multicolor part
        const colorGeometryMap = new Map<number, BufferGeometry>();
        resolvedPart.colorVertexMap.forEach((vertices, color) => {
          const indices = resolvedPart.colorIndexMap.get(color) ?? [];
          if (indices.length > 0)
            colorGeometryMap.set(color, createBufferGeometry(resolvedPart.id, vertices, indices, instructionVersion, this.ENABLE_FLAT_SHADING));
        });
        instructionModel.ldrData.idToColorGeometryMap.set(referencedName, colorGeometryMap);
        for (let vertices of resolvedPart.colorLineVertexMap.values())
          instructionModel.ldrData.idToLineGeometryMap.set(resolvedPart.id, createLineGeometry(resolvedPart.id, vertices, instructionVersion, this.ENABLE_FLAT_SHADING));
      } else { //if part is single color part
        this.createGeometryIfNotExists(resolvedPart, instructionModel.ldrData.idToGeometryMap, instructionModel.ldrData.idToLineGeometryMap, instructionVersion);
      }
    }

    //resolve submodels
    const firstSubmodel = instructionModel.submodels.get(topSubmodel);
    if (firstSubmodel)
      this.collectPartRefs(firstSubmodel, instructionModel, 1);

    return instructionModel;
  }

  private countSubmodelAmount(submodelName: string, partReferences: PartReference[]): number {
    let count = 0;
    for (let i: number = 0; i < partReferences.length; i++) {
      if (partReferences[i].name === submodelName)
        count++;
    }
    return count;
  }

  private collectPartRefs(currentSubmodel: InstructionSubmodel, instructionModel: InstructionModel, submodelReferenceAmount: number): void {
    //accumulate the submodels and parts used in this submodels steps
    const previousSubmodels: InstructionSubmodelReference[] = [];
    const previousParts: InstructionPartReference[] = [];
    let isFirstStep = true;

    for (let stepIndex = 0; stepIndex < currentSubmodel.stepReferences.length; stepIndex++) {
      const partReferences: PartReference[] = currentSubmodel.stepReferences[stepIndex];

      const instructionStep: InstructionStep = {
        previousSubmodels: [],
        previousParts: [],
        newParts: [],
        newSubmodels: [],
        parentSubmodel: currentSubmodel.name,
        parentSubmodelAmount: submodelReferenceAmount,
        isFirstStepInSubmodel: isFirstStep
      };
      isFirstStep = false;
      //add the previous parts to this steps prevPartslist (same with submodel)
      instructionStep.previousParts.push(...previousParts);
      instructionStep.previousSubmodels.push(...previousSubmodels);

      const thisStepsSubmodels: string[] = []; //list of already made submodels so against resolving same submodels multiple times
      for (let partReferenceIndex: number = 0; partReferenceIndex < partReferences.length; partReferenceIndex++) {
        const partReference: PartReference = partReferences[partReferenceIndex];

        const referencedThing = instructionModel.submodels.get(partReference.name);
        if (referencedThing) { //If Submodel
          if (!thisStepsSubmodels.includes(partReference.name)) { //has not already been resolved in this step
            this.collectPartRefs(referencedThing, instructionModel, this.countSubmodelAmount(partReference.name, partReferences));
            thisStepsSubmodels.push(partReference.name);
          }
          //Add the submodel as reference into this step and add the group transformed into the parent submodel
          instructionStep.newSubmodels.push({
            submodelName: partReference.name,
            transformMatrix: partReference.transformMatrix
          });
          previousSubmodels.push({
            submodelName: partReference.name,
            transformMatrix: partReference.transformMatrix
          });
          const submodelPartOfParent = referencedThing.group.clone();
          const prevSubmodelPartOfParent = referencedThing.prevGroup.clone();
          submodelPartOfParent.applyMatrix4(partReference.transformMatrix);
          prevSubmodelPartOfParent.applyMatrix4(partReference.transformMatrix);
          currentSubmodel.group.add(submodelPartOfParent);
          currentSubmodel.prevGroup.add(prevSubmodelPartOfParent);
        } else { //If Part
          const partIsConstructed = instructionModel.parts.get(partReference.color + "###" + partReference.name);
          if (!partIsConstructed) { //If it's not in the list of all parts yet -> put it there
            const foundPart = instructionModel.ldrData.allPartsMap.get(partReference.name);
            const partGroup = new Group();
            const prevPartGroup = new Group();
            if (foundPart && foundPart.colorVertexMap.size > 1) { //Is part with multiple colors //TODO auf prev achten!
              const geometries = instructionModel.ldrData.idToColorGeometryMap.get(partReference.name);
              geometries?.forEach((geometry, color) => {
                if (color === 16 || color === 24 || color === -1 || color === -2)
                  color = partReference.color;
                const material = instructionModel.ldrData.colorToMaterialMap.get(color);
                const prevMaterial = instructionModel.ldrData.colorToPrevMaterialMap.get(color);
                const mesh = new Mesh(geometry, material);
                const prevMesh = new Mesh(geometry, prevMaterial);
                if (this.ENABLE_SHADOWS) {
                  mesh.castShadow = true;
                  mesh.receiveShadow = true;
                  prevMesh.castShadow = true;
                  prevMesh.receiveShadow = true;
                }
                partGroup.add(mesh);
                prevPartGroup.add(prevMesh);
              });
            } else { //Is part with single color
              const geometry = instructionModel.ldrData.idToGeometryMap.get(partReference.name);
              const material = instructionModel.ldrData.colorToMaterialMap.get(partReference.color);
              const prevMaterial = instructionModel.ldrData.colorToPrevMaterialMap.get(partReference.color);
              const mesh = new Mesh(geometry, material);
              const prevMesh = new Mesh(geometry, prevMaterial);
              if (this.ENABLE_SHADOWS) {
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                prevMesh.castShadow = true;
                prevMesh.receiveShadow = true;
              }
              partGroup.add(mesh);
              prevPartGroup.add(prevMesh);
            }
            const lineGeometry = instructionModel.ldrData.idToLineGeometryMap.get(partReference.name);
            const lineMaterial = partReference.color === 0 ? this.lineMaterials[0] : this.lineMaterials[1];
            const prevLineMaterial = partReference.color === 0 ? this.prevLineMaterials[0] : this.prevLineMaterials[1];
            const lineMesh = new LineSegments(lineGeometry, lineMaterial);
            const prevLineMesh = new LineSegments(lineGeometry, prevLineMaterial);
            partGroup.add(lineMesh);
            prevPartGroup.add(prevLineMesh);

            //add to map of all parts
            const newPart: InstructionPart = {
              id: partReference.name,
              prevGroup: prevPartGroup.clone(),
              group: partGroup.clone()
            };
            instructionModel.parts.set(partReference.color + "###" + partReference.name, newPart);

            //add as parts to group of current submodel
            partGroup.applyMatrix4(partReference.transformMatrix);
            prevPartGroup.applyMatrix4(partReference.transformMatrix);
            currentSubmodel.group.add(partGroup);
            currentSubmodel.prevGroup.add(prevPartGroup);
          } else {
            const constructedPart = partIsConstructed.group.clone(); //TODO clone needed?
            constructedPart.applyMatrix4(partReference.transformMatrix);
            currentSubmodel.group.add(constructedPart);
            const constructedPrevPart = partIsConstructed.prevGroup.clone(); //TODO clone needed?
            constructedPrevPart.applyMatrix4(partReference.transformMatrix);
            currentSubmodel.prevGroup.add(constructedPrevPart);
          }
          instructionStep.newParts.push({
            partId: partReference.name,
            color: partReference.color,
            transformMatrix: partReference.transformMatrix
          });
          previousParts.push({
            partId: partReference.name,
            color: partReference.color,
            transformMatrix: partReference.transformMatrix
          });
        }
      }
      instructionModel.instructionSteps.push(instructionStep);
    }
  }

  private parsePartLines(partLines: string[], colorToMaterialMap: Map<number, Material>, colorToPrevMaterialMap: Map<number, Material>, defaultAnyColor?: Color): LdrPart {

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
      const partLine = partLines[partLineIndex].trim();
      if (partLine.startsWith("1")) { //line is a reference
        references.push(parseLineTypeOne(partLine, invertNext));
        invertNext = false;
        this.createMaterialIfNotExists(references[references.length - 1].color, colorToMaterialMap, colorToPrevMaterialMap, defaultAnyColor);
      } else if (partLine.startsWith("0 FILE")) { //line is a part id
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

        this.createMaterialIfNotExists(parsed.color, colorToMaterialMap, colorToPrevMaterialMap, defaultAnyColor);
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
      } else if (partLine.startsWith("2") && this.ENABLE_PART_LINES) { //line is a line
        const parsed = parseLineTypeTwo(partLine);
        const entry = colorLineVertexMap.get(parsed.color) ?? [];
        colorLineVertexMap.set(parsed.color, entry.concat(parsed.points));

        invertNext = false;
      }
    }
    return new LdrPart(partId, partName, colorVertexMap, colorIndexMap, colorLineVertexMap, references);
  }

  private createMaterialIfNotExists(color: number, colorToMaterialMap: Map<number, Material>, colorToPrevMaterialMap: Map<number, Material>, defaultAnyColor?: Color): void {
    if (!colorToMaterialMap.has(color) && color != 24 && color != 16 && color != -1 && color != -2) {
      const matParams = this.ldrawColorService.resolveColorByLdrawColorId(color, defaultAnyColor);
      const material = new MeshStandardMaterial();
      material.flatShading = this.ENABLE_FLAT_SHADING;
      material.setValues(matParams);
      colorToMaterialMap.set(color, material);

      const prevMatParams = this.ldrawColorService.resolveColorByLdrawColorId(color, defaultAnyColor);
      const prevMaterial = material.clone();
      prevMaterial.color = prevMatParams.color.clone().lerp(this.PREV_INTERPOLATION_COLOR, this.PREV_INTERPOLATION_PERCENTAGE);
      colorToPrevMaterialMap.set(color, prevMaterial);
    }
  }

  private createGeometryIfNotExists(part: LdrPart, nameToGeometryMap: Map<string, BufferGeometry>, nameToLineGeometryMap: Map<string, BufferGeometry>, instructionVersion: string): void {
    if (nameToGeometryMap.has(part.id)) return;
    part.colorVertexMap.forEach((vertices, color) => { // should only be called once
      const indices = part.colorIndexMap.get(color);
      if (!indices) console.error("Color not found: vertices exist but no face to em");
      else nameToGeometryMap.set(part.id, createBufferGeometry(part.id, vertices, indices, instructionVersion, this.ENABLE_FLAT_SHADING));
    });
    part.colorLineVertexMap.forEach((vertices, color) => {
      nameToLineGeometryMap.set(part.id, createLineGeometry(part.id, vertices, instructionVersion, this.ENABLE_FLAT_SHADING));
    });
  }

  getModelByStep(instructionModel: InstructionModel, stepIndex: number): StepModel {
    const currentStep: InstructionStep = instructionModel.instructionSteps[stepIndex];
    const newPartsGroup = new Group();
    const prevPartsGroup = new Group();
    const stepPartsList: StepPart[] = [];

    for (let i = 0; i < currentStep.newParts.length; i++) {
      const iPartReference = currentStep.newParts[i];
      const pPart = instructionModel.parts.get(iPartReference.color + "###" + iPartReference.partId);
      if (!pPart) continue; //not found

      const part = pPart.group.clone();
      part.applyMatrix4(iPartReference.transformMatrix);
      newPartsGroup.add(part);

      //create the part list of all the parts added in this step
      let found = false;
      for (let i = 0; i < stepPartsList.length; i++) {
        if (stepPartsList[i].partId === iPartReference.partId && stepPartsList[i].color === iPartReference.color) {
          stepPartsList[i].quantity += 1;
          found = true;
          break;
        }
      }
      if (!found) {
        let partName = instructionModel.ldrData.allPartsMap.get(iPartReference.partId)?.name ?? "";
        if (partName.includes("Moved To ")) { //if the model is a moved one then search for the actual part name
          let newPartName = partName.split("Moved To ")[1].trim();
          if (!newPartName.endsWith(".dat"))
            newPartName += ".dat";
          partName = instructionModel.ldrData.allPartsMap.get(newPartName)?.name ?? "";
        }
        stepPartsList.push({
          model: pPart.group,
          partName: partName,
          color: iPartReference.color,
          partId: iPartReference.partId,
          quantity: 1
        });
      }
    }

    for (let i = 0; i < currentStep.newSubmodels.length; i++) {
      const iSubReference = currentStep.newSubmodels[i];
      const pSubmodel = instructionModel.submodels.get(iSubReference.submodelName);
      if (pSubmodel) {
        const submodel = pSubmodel.group.clone();
        submodel.applyMatrix4(iSubReference.transformMatrix);
        newPartsGroup.add(submodel);
      }
    }

    for (let i = 0; i < currentStep.previousSubmodels.length; i++) {
      const iSubReference = currentStep.previousSubmodels[i];
      const pSubmodel = instructionModel.submodels.get(iSubReference.submodelName);
      if (pSubmodel) {
        const submodel = pSubmodel.prevGroup.clone();
        submodel.applyMatrix4(iSubReference.transformMatrix);
        prevPartsGroup.add(submodel);
      }
    }

    for (let i = 0; i < currentStep.previousParts.length; i++) {
      const iPartReference = currentStep.previousParts[i];
      const pPart = instructionModel.parts.get(iPartReference.color + "###" + iPartReference.partId);
      if (pPart) {
        const part = pPart.prevGroup.clone();
        part.applyMatrix4(iPartReference.transformMatrix);
        prevPartsGroup.add(part);
      }
    }

    newPartsGroup.rotateOnWorldAxis(new Vector3(0, 0, 1), Math.PI);
    prevPartsGroup.rotateOnWorldAxis(new Vector3(0, 0, 1), Math.PI);
    newPartsGroup.scale.setScalar(0.044);
    prevPartsGroup.scale.setScalar(0.044);

    //add the model of the parent submodel if this is the first step in said submodel
    let parentSubmodel = null;
    if (currentStep.isFirstStepInSubmodel) {
      parentSubmodel = instructionModel.submodels.get(currentStep.parentSubmodel)?.group || null;
    }

    stepPartsList.sort((a: StepPart, b: StepPart) => {
      const aBox = new Box3().setFromObject(a.model);
      const bBox = new Box3().setFromObject(b.model);
      const x = (aBox.max.x - aBox.min.x) - (bBox.max.x - bBox.min.x);
      const y = (aBox.max.y - aBox.min.y) - (bBox.max.y - bBox.min.y);
      return x !== 0 ? x : (y !== 0 ? y : (aBox.max.z - aBox.min.z) - (bBox.max.z - bBox.min.z));
    });

    return {
      newPartsModel: newPartsGroup,
      prevPartsModel: prevPartsGroup,
      stepPartsList: stepPartsList,
      parentSubmodelModel: parentSubmodel,
      parentSubmodelAmount: currentStep.parentSubmodelAmount
    };
  }

  getFullModel(instructionModel: InstructionModel): Group {
    const currentStep: InstructionStep = instructionModel.instructionSteps[instructionModel.instructionSteps.length - 1];
    const partsGroup = new Group();

    for (let i = 0; i < currentStep.newSubmodels.length; i++) {
      const iSubReference = currentStep.newSubmodels[i];
      const pSubmodel = instructionModel.submodels.get(iSubReference.submodelName);
      if (pSubmodel) {
        const submodel = pSubmodel.group.clone();
        submodel.applyMatrix4(iSubReference.transformMatrix);
        partsGroup.add(submodel);
      }
    }

    for (let i = 0; i < currentStep.previousSubmodels.length; i++) {
      const iSubReference = currentStep.previousSubmodels[i];
      const pSubmodel = instructionModel.submodels.get(iSubReference.submodelName);
      if (pSubmodel) {
        const submodel = pSubmodel.group.clone();
        submodel.applyMatrix4(iSubReference.transformMatrix);
        partsGroup.add(submodel);
      }
    }

    for (let i = 0; i < currentStep.previousParts.length; i++) {
      const iPartReference = currentStep.previousParts[i];
      const pPart = instructionModel.parts.get(iPartReference.color + "###" + iPartReference.partId);
      if (pPart) {
        const part = pPart.group.clone();
        part.applyMatrix4(iPartReference.transformMatrix);
        partsGroup.add(part);
      }
    }

    for (let i = 0; i < currentStep.newParts.length; i++) {
      const iPartReference = currentStep.newParts[i];
      const pPart = instructionModel.parts.get(iPartReference.color + "###" + iPartReference.partId);
      if (pPart) {
        const part = pPart.group.clone();
        part.applyMatrix4(iPartReference.transformMatrix);
        partsGroup.add(part);
      }
    }

    partsGroup.rotateOnWorldAxis(new Vector3(0, 0, 1), Math.PI);
    partsGroup.scale.setScalar(0.044);

    return partsGroup;
  }
}
