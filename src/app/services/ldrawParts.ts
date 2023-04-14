import { Group, Matrix4, Vector3 } from "three";

export class LdrPart {
    name: string;
    isResolved: boolean = false;
    pointColorMap: Map<number, Vector3[]>;
    references: PartReference[];
    partIndex: number = 0;

    constructor(name: string, pointColorMap: Map<number, Vector3[]>, references: PartReference[]) {
        this.name = name;
        this.pointColorMap = pointColorMap;
        this.references = references;
    }
}

export class LdrColor{
    name:string;
    hex:string;
    edgeHex:string;
    code:number;
    
    constructor(name:string, hex:string,edgeHex:string,code:number) {
        this.name = name;
        this.hex = hex;
        this.edgeHex = edgeHex;
        this.code = code;
    }
}

export class LdrSubmodel {
    name: string;
    references: PartReference[];
    resolved = false;
    group: Group;

    constructor(name: string, references: PartReference[]) {
        this.name = name;
        this.references = references;
        this.group = new Group();
    }
}


export class PartReference {
    name: string;
    transformMatrix: Matrix4;
    color: number;
    invert: boolean;

    constructor(name: string, transformMatrix: Matrix4, color: number, invert: boolean) {
        this.name = name;
        this.transformMatrix = transformMatrix;
        this.color = color;
        this.invert = invert;
    }
}