import {Injectable} from '@angular/core';
import {
  BufferGeometry, Color, Group, LineBasicMaterial, LineSegments, Material, Mesh,
  MeshStandardMaterial, Vector3
} from "three";
import {environment} from "../../../environments/environment";
import {LdrawColorService} from "../color/ldraw-color.service";
import {
  InstructionModel, InstructionPart, InstructionPartReference, InstructionStep,
  InstructionSubmodel, InstructionSubmodelReference, StepModel, StepPart
} from "../../model/instructions";
import {LdrPart, PartReference} from "../../model/ldrawParts";
import {LdrToThreeService} from "./ldr-to-three.service";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

@Injectable({
  providedIn: 'root'
})
export class InstructionService {

  private readonly PREVINTERPOLATIONCOLOR = new Color(0.344, 0.394, 0.457);
  private readonly PREVINTERPOLATIONPERCENTAGE:number= 0.7;

  //Because there are only two possible lineColors I just initialize them here :)
  private lineMaterials = [new LineBasicMaterial({color: this.ldrawColorService.getHexColorFromLdrawColorId(71)}), new LineBasicMaterial({color: this.ldrawColorService.getHexColorFromLdrawColorId(0)})];
  private prevLineMaterials = [new LineBasicMaterial({color: this.ldrawColorService.getHexColorFromLdrawColorId(71)}), new LineBasicMaterial({color: this.ldrawColorService.getHexColorFromLdrawColorId(0)})];

  constructor(private ldrawColorService: LdrawColorService, private ldrToThreeService: LdrToThreeService) {
  }

  async getInstructionModel(fileLink: string): Promise<InstructionModel> {
    const fileName = fileLink.slice(0, fileLink.length - 2) + "ldr"
    const contents = await fetch(environment.backendFetchUrl + fileName);

    return this.createInstructionModel(await contents.text());
  }

  private createInstructionModel(ldrFileContent: string): InstructionModel {
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

    const ldrObjects = ldrFileContent.split("0 NOSUBMODEL"); //0 = submodels, 1 = parts

    if (ldrObjects.length != 2) {
      console.error("Error: file is formated wrong, no submodel divider found: ", ldrObjects.length);
      return instructionModel;
    }

    //Parsing submodels
    const rawSubmodelLines = ldrObjects[0].split("0 NOFILE");
    const referenceNames: string[] = []; //a list of all the names of referenced parts & submodels
    for (let i = 0; i < rawSubmodelLines.length; i++) {
      const submodelLines = rawSubmodelLines[i].split("\n");

      //if it's literally empty then skip it
      let empty = true;
      for (let j = 0; j < submodelLines.length; j++)
        if (submodelLines[j].trim() != "") {
          empty = false;
          break;
        }
      if (empty) continue;

      let submodelName: string = "";
      const stepReferences: PartReference[][] = [];
      stepReferences.push([]);
      let stepCounter = 0;

      for (let j = 0; j < submodelLines.length; j++) {
        let submodelLine = submodelLines[j];
        if (submodelLine.endsWith("\r"))
          submodelLine = submodelLine.slice(0, submodelLine.lastIndexOf("\r"));
        if (submodelLine.startsWith("1")) {
          const createdReference = this.ldrToThreeService.parseLineTypeOne(submodelLine, submodelLines[j - 1].includes("0 BFC INVERTNEXT"));
          stepReferences[stepCounter].push(createdReference);
          this.createMaterialIfNotExists(createdReference.color, instructionModel.ldrData.colorToMaterialMap, instructionModel.ldrData.colorToPrevMaterialMap);
          if (!referenceNames.includes(createdReference.name))
            referenceNames.push(createdReference.name);
        } else if (submodelLine.startsWith("0 STEP")) {
          stepCounter++;
          stepReferences.push([]);
        } else if (submodelLine.startsWith("0 FILE"))
          submodelName = submodelLine.slice(7).toLowerCase();
        else if (submodelLine.startsWith("0 Name:") && submodelName == "no name") //backup in case no name got set which can happen
          submodelName = submodelLine.slice(9).toLowerCase();
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
    }

    //Parsing parts
    const rawPartLines = ldrObjects[1].split("0 NOFILE");
    for (let i = 0; i < rawPartLines.length; i++) {
      const partLines = rawPartLines[i];
      const parsedPart: LdrPart = this.parsePartLines(partLines, instructionModel.ldrData.colorToMaterialMap, instructionModel.ldrData.colorToPrevMaterialMap);
      instructionModel.ldrData.allPartsMap.set(parsedPart.id, parsedPart);
      if (!referenceNames.includes(parsedPart.id)) continue; //if it's a subpart, then skip it
      const resolvedPart = this.resolvePart(parsedPart.id, instructionModel.ldrData.allPartsMap); //collects all vertices in the top part, so all subparts wil be resolved
      if (resolvedPart.colorVertexMap.size > 1) { //if part is multicolor part
        const colorGeometryMap = new Map<number, BufferGeometry>();
        resolvedPart.colorVertexMap.forEach((vertices, color) => {
          const indices = resolvedPart.colorIndexMap.get(color) ?? [];
          if (indices.length > 0)
            colorGeometryMap.set(color, this.createGeometry(resolvedPart.id, vertices, indices));
        });
        instructionModel.ldrData.idToColorGeometryMap.set(parsedPart.id, colorGeometryMap);
        for (let vertices of resolvedPart.colorLineVertexMap.values())
          instructionModel.ldrData.idToLineGeometryMap.set(resolvedPart.id, this.createLineGeometry(resolvedPart.id, vertices));
      } else { //if part is single color part
        this.createGeometryIfNotExists(resolvedPart, instructionModel.ldrData.idToGeometryMap, instructionModel.ldrData.idToLineGeometryMap);
      }
    }

    const firstSubmodel = instructionModel.submodels.get(topSubmodel);
    if (firstSubmodel)
      this.collectPartRefs(firstSubmodel, instructionModel,1);

    return instructionModel;
  }

  private countSubmodelAmount(submodelName:string,partReferences:PartReference[]):number{
    let count = 0;
    for(let i:number = 0; i<partReferences.length;i++){
      if(partReferences[i].name === submodelName)
        count++;
    }
    return count;
  }

  private collectPartRefs(currentSubmodel: InstructionSubmodel, instructionModel: InstructionModel, submodelReferenceAmount:number): void {
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
            this.collectPartRefs(referencedThing, instructionModel, this.countSubmodelAmount(partReference.name,partReferences));
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
                if(color === 16 || color === 24 || color === -1 || color === -2)
                  color = partReference.color;
                const material = instructionModel.ldrData.colorToMaterialMap.get(color);
                const prevMaterial = instructionModel.ldrData.colorToPrevMaterialMap.get(color);
                const mesh = new Mesh(geometry, material);
                const prevMesh = new Mesh(geometry, prevMaterial);
                partGroup.add(mesh);
                prevPartGroup.add(prevMesh);
              });
            } else { //Is part with single color
              const geometry = instructionModel.ldrData.idToGeometryMap.get(partReference.name);
              const material = instructionModel.ldrData.colorToMaterialMap.get(partReference.color);
              const prevMaterial = instructionModel.ldrData.colorToPrevMaterialMap.get(partReference.color);
              const partMesh = new Mesh(geometry, material);
              const prevPartMesh = new Mesh(geometry, prevMaterial);
              partGroup.add(partMesh);
              prevPartGroup.add(prevPartMesh);
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

  private resolvePart(partName: string, allPartsMap: Map<string, LdrPart>): LdrPart {
    const ldrPart = allPartsMap.get(partName);
    if (!ldrPart) throw ("Error: Part could not be found: " + partName);
    if (ldrPart.isResolved) return ldrPart;

    //resolve Part
    for (let i = 0; i < ldrPart.references.length; i++) {
      const partReference = ldrPart.references[i];

      const referencedPart = allPartsMap.get(partReference.name)
      if (!referencedPart) continue;

      this.resolvePart(partReference.name, allPartsMap);

      const colorVertexIndexMap = new Map<number, Map<number, number>>(); //each colors indices of vertices will be different so they need to be mapped to the actual ones

      //for all colors and their vertices that the referenced part has
      referencedPart.colorVertexMap.forEach((vertices, color) => { //TODO change this loop to be more performing
        const indexMap = new Map<number, number>();

        let actualPartColor = color; //a color can also be determined by above for a subPart, thats why this is to be checked here
        if (partReference.color !== 16 && partReference.color !== 24 && partReference.color !== -1 && partReference.color !== -2
          && (color === 16 || color === 24 || color === -1 || color === -2))
          actualPartColor = partReference.color;

        for (let i = 0; i < vertices.length; i++) { //transform each vertex and see if it already exists
          const transformedVertex = vertices[i].clone().applyMatrix4(partReference.transformMatrix);
          if (!ldrPart.colorVertexMap.has(actualPartColor)) { //color not found here => therefore the color is a color that's being determined from above
            ldrPart.colorVertexMap.set(actualPartColor, [transformedVertex]);
            indexMap.set(i, i);
          } else if (!ldrPart.colorVertexMap.get(actualPartColor)?.find(v => v.equals(transformedVertex))) { //part not in list already (if flat shading is disabled dont go into  the else part)
            const vertices = ldrPart.colorVertexMap.get(actualPartColor);
            if (vertices) {
              vertices.push(transformedVertex);
              indexMap.set(i, vertices.length - 1);
            } else throw "Part or Color not found during adding referenced parts vertices";
          } else //vertex has already been added of this color
            indexMap.set(i, ldrPart.colorVertexMap.get(actualPartColor)?.findIndex(v => v.equals(transformedVertex)) ?? -1);
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

    ldrPart.isResolved = true;
    return ldrPart;
  }

  private parsePartLines(partText: string, colorToMaterialMap: Map<number, Material>, colorToPrevMaterialMap: Map<number, Material>): LdrPart {
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
        references.push(this.ldrToThreeService.parseLineTypeOne(partLine, invertNext));
        invertNext = false;
        this.createMaterialIfNotExists(references[references.length - 1].color, colorToMaterialMap, colorToPrevMaterialMap);
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
          parsed = this.ldrToThreeService.parseLineTypeThree(partLine, (invertNext || isCW) && !(invertNext && isCW));
        else
          parsed = this.ldrToThreeService.parseLineTypeFour(partLine, (invertNext || isCW) && !(invertNext && isCW));

        this.createMaterialIfNotExists(parsed.color, colorToMaterialMap, colorToPrevMaterialMap);
        const partVertices = colorVertexMap.get(parsed.color);

        const vertexIndexMap = new Map<number, number>(); //maps the old index of the vertex to the position in the colorIndexMap

        //put all vertices into partVertices and to the vertexIndexMap
        if (partVertices)  //The current part already knows this color
          for (let i = 0; i < parsed.vertices.length; i++) {
            const found = partVertices.findIndex(p => p.equals(parsed.vertices[i]));
            if (found != -1) //vertex already exists
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
        const parsed = this.ldrToThreeService.parseLineTypeTwo(partLine);
        const entry = colorLineVertexMap.get(parsed.color) ?? [];
        colorLineVertexMap.set(parsed.color, entry.concat(parsed.points));
        invertNext = false;
      }
    }

    return new LdrPart(partId, partName, colorVertexMap, colorIndexMap, colorLineVertexMap, references);
  }

  private createMaterialIfNotExists(color: number, colorToMaterialMap: Map<number, Material>, colorToPrevMaterialMap: Map<number, Material>): void {
    if (!colorToMaterialMap.has(color) && color != 24 && color != 16 && color != -1 && color != -2) {
      const matParams = this.ldrawColorService.resolveColorByLdrawColorId(color);
      const material = new MeshStandardMaterial();
      material.flatShading = true;
      material.setValues(matParams);
      colorToMaterialMap.set(color, material);

      const prevMatParams = this.ldrawColorService.resolveColorByLdrawColorId(color);
      const prevMaterial = material.clone();
      prevMaterial.color = prevMatParams.color.clone().lerp(this.PREVINTERPOLATIONCOLOR, this.PREVINTERPOLATIONPERCENTAGE);
      colorToPrevMaterialMap.set(color, prevMaterial);
    }
  }

  private createGeometryIfNotExists(part: LdrPart, nameToGeometryMap: Map<string, BufferGeometry>, nameToLineGeometryMap: Map<string, BufferGeometry>): void {
    if (nameToGeometryMap.has(part.id)) return;
    part.colorVertexMap.forEach((vertices, color) => { // should only be called once
      const indices = part.colorIndexMap.get(color);
      if (!indices) console.error("Color not found: vertices exist but no face to em");
      else nameToGeometryMap.set(part.id, this.createGeometry(part.id, vertices, indices));
    });
    part.colorLineVertexMap.forEach((vertices, color) => {
      nameToLineGeometryMap.set(part.id, this.createLineGeometry(part.id, vertices));
    });
  }

  private createGeometry(partName: string, vertices: Vector3[], indices: number[]): BufferGeometry {
    let partGeometry = new BufferGeometry();
    partGeometry.setFromPoints(vertices);
    partGeometry.setIndex(indices);

    //some parts need special attention...
    if (partName == "28192.dat") {
      partGeometry.rotateY(-Math.PI / 2);
      partGeometry.translate(-10, -24, 0);
    } else if (partName == "68013.dat")
      partGeometry.rotateY(-Math.PI);
    else if (partName == "70681.dat")
      partGeometry.translate(0, 0, 20);
    else if (partName == "49803.dat")
      partGeometry.translate(0, -32, 0);

    partGeometry = BufferGeometryUtils.mergeVertices(partGeometry, 0.1); //if (this.ENABLE_FLAT_SHADING)
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
    } else if (partName == "68013.dat")
      partGeometry.rotateY(-Math.PI);
    else if (partName == "70681.dat")
      partGeometry.translate(0, 0, 20);
    else if (partName == "49803.dat")
      partGeometry.translate(0, -32, 0);

    partGeometry = BufferGeometryUtils.mergeVertices(partGeometry, 0.1); //if (this.ENABLE_FLAT_SHADING)

    return partGeometry;
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

      //create the partslist of all the parts added in this step
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
        if(partName.includes("Moved To ")){ //if the model is a moved one then search for the actual part name
          let newPartName = partName.split("Moved To ")[1].trim();
          if(!newPartName.endsWith(".dat"))
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
    let parentSubmodel = undefined;
    if( currentStep.isFirstStepInSubmodel){
      parentSubmodel = instructionModel.submodels.get(currentStep.parentSubmodel)?.group;
    }

    return {newPartsModel: newPartsGroup,prevPartsModel: prevPartsGroup, stepPartsList: stepPartsList, parentSubmodelModel: parentSubmodel, parentSubmodelAmount: currentStep.parentSubmodelAmount};
  }
}
