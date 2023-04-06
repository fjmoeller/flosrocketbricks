import { Matrix4, Triangle, Vector3 } from "three";

export class LdrSub {
    id: string;
    parts: string[];
    constructor(id: string, parts: string[]) {
        this.id = id;
        this.parts = parts;
    }
}

export class LdrPart {
    name: string;
    isSubmodel: boolean;
    isPart: boolean;
    isResolved: boolean = false;
    points: Vector3[];
    references: PartReference[];
    partIndex: number = 0;

    constructor(name: string, isSubmodel: boolean, isPart: boolean, points: Vector3[], references: PartReference[]) {
        this.name = name;
        this.isSubmodel = isSubmodel;
        this.isPart = isPart;
        this.points = points;
        this.references = references;
    }
}

export class LdrObject {
    id: string;
    triangles: Triangle[];
    constructor(id: string, triangles: Triangle[]) {
        this.id = id;
        this.triangles = triangles;
    }
}

export class PartReference {
    name: string;
    transformMatrix: Matrix4;
    color: number;
    invert:boolean;
    constructor(name: string, transformMatrix: Matrix4, color: number,invert:boolean) {
        this.name = name;
        this.transformMatrix = transformMatrix;
        this.color = color;
        this.invert = invert;
    }
}