export class SimpleLdrSubmodel {
    name: string;
    references: SimpleReference[];
    constructor(name: string, references: SimpleReference[]) {
        this.name = name;
        this.references = references;
    }
}

export class SimpleReference {
    name: string;
    color: number;
    constructor(name: string, color: number) {
        this.name = name;
        this.color = color;
    }
}