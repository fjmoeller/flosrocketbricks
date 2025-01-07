export class PartMapping {
    r:string;
    l:string[];
    b:string[];

    constructor(r:string,l:string[],b:string[]){
        this.r = r;
        this.b = b;
        this.l = l;
    }
}

export class PartMappingFix {
    r:string;
    l:string;
    b:string;
    io:string;

    constructor(r:string,l:string,b:string,io:string){
        this.r = r;
        this.b = b;
        this.l = l;
        this.io = io;
    }
}

export class SpecificPartMapping {
    r:string;
    l:string;
    b:string;

    constructor(r:string,l:string,b:string){
        this.r = r;
        this.b = b;
        this.l = l;
    }
}

export class BricklinkRefactoredPart {
  oldId!:string;
  newId!:string;
}
