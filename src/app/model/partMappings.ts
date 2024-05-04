export class MultiPartMapping {
    r:string;
    l:string[];
    b:string[];

    constructor(r:string,l:string[],b:string[]){
        this.r = r;
        this.b = b;
        this.l = l;
    }
}

export class SinglePartMapping {
    r:string;
    l:string;
    b:string;

    constructor(r:string,l:string,b:string){
        this.r = r;
        this.b = b;
        this.l = l;
    }
}

export class PrintPartMapping {
    l:string;
    b:string;

    constructor(l:string,b:string){
        this.b = b;
        this.l = l;
    }
}