import {BufferGeometry, Group, Material, Matrix4, Mesh} from "three";
import {LdrPart, PartReference} from "./ldrawParts";

export interface StepModel {
  newPartsModel: Group;
  prevPartsModel: Group;
  stepPartsList: StepPart[];
}

export interface StepPart {
  partName: string;
  color: number;
  quantity: number;
  model: Group;
}

export interface InstructionModel {
  instructionSteps: InstructionStep[];

  submodels: Map<string, InstructionSubmodel>;
  //the key (string) is always of the format <colorid>###<partname>
  parts: Map<string, InstructionPart>; //TODO Group hier richtig -> denke nicht

  ldrData: LdrData;
}

export interface LdrData {
  colorToMaterialMap: Map<number,Material>,
  colorToPrevMaterialMap: Map<number,Material>,
  nameToGeometryMap: Map<string,BufferGeometry>,
  nameToColorGeometryMap: Map<string,Map<number,BufferGeometry>>,
  nameToLineGeometryMap: Map<string,BufferGeometry>,
  allPartsMap: Map<string,LdrPart>,
}

export interface InstructionStep {
  parentSubmodel: string; //parent submodel defines which previously added parts should be visible
  previousParts: InstructionPartReference[];
  previousSubmodels: InstructionSubmodelReference[];
  newSubmodels: InstructionSubmodelReference[];
  newParts: InstructionPartReference[];
}

export interface InstructionPartReference {
  partName: string;
  transformMatrix: Matrix4;
  color: number;
}

export interface InstructionSubmodelReference {
  submodelName: string;
  transformMatrix: Matrix4;
}

export interface InstructionSubmodel {
  name: string;
  stepReferences: PartReference[][]; //for each step: the references to parts& submodels in this step
  group: Group;
  prevGroup: Group;
}

export interface InstructionPart {
  name: string;
  group: Group;
  prevGroup: Group;
}
