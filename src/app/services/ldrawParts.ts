import { Matrix4, Vector3 } from "three";

export class LdrPart {
    name: string;
    isSubmodel: boolean;
    isPart: boolean;
    isResolved: boolean = false;
    points: Vector3[];
    linePoints: Vector3[];
    references: PartReference[];
    partIndex: number = 0;

    constructor(name: string, isSubmodel: boolean, isPart: boolean, points: Vector3[], linePoints: Vector3[], references: PartReference[]) {
        this.name = name;
        this.isSubmodel = isSubmodel;
        this.isPart = isPart;
        this.points = points;
        this.linePoints = linePoints;
        this.references = references;
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