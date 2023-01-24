import { Injectable } from '@angular/core';
import { Moc } from '../components/classes';

@Injectable({
    providedIn: 'root'
})
export class DataMockupService {

    constructor() { }

    private mocs: Moc[] = [
        {
            id: 0,
            title: "Empty Moc",
            pictures: ["https://cdn.rebrickable.com/media/thumbs/mocs/moc-135248.jpg/1000x800.jpg?1673886137.049721", "https://bricksafe.com/files/SkySaac/omega/V1.1_3.png/750x600p.png"],
            parts: 0,
            dimensions: "0x0x0",
            scale: "0:0",
            designer: "no one",
            stability: "good",
            difficulty: "easy",
            lastupdate: "now",
            tags: ["rocket", "launchpad"],
            related: [],
            description: "description",
            versions: [{ version: "V0", versionExtra: "extra", changelog: "-", files: [{ link: "http.cat", name: "file", desc: "description" }] }]
        }, {
            id: 1,
            title: "Empty Moc 2",
            pictures: ["https://cdn.rebrickable.com/media/thumbs/mocs/moc-135248.jpg/1000x800.jpg?1673886137.049721", "https://bricksafe.com/files/SkySaac/omega/V1.1_3.png/750x600p.png"],
            parts: 1,
            dimensions: "1x1x1",
            scale: "1:1",
            designer: "no one",
            stability: "good",
            difficulty: "easy",
            lastupdate: "now",
            tags: ["rocket"],
            related: [],
            description: "description",
            versions: [
                { version: "V1", versionExtra: "extra", changelog: "-", files: [{ link: "http.cat/200", name: "file", desc: "description" }] },
                { version: "V2", versionExtra: "extra", changelog: "-", files: [{ link: "http.cat/200", name: "filee", desc: "description" }] }
            ]
        }];

    getMocs(searchPath: string, filterTags: string[]): Moc[] {
        return this.mocs;
    }

    getMoc(id: number): Moc {
        console.log("DataMockupService: Service is searching for id: "+id)
        return this.mocs.filter(moc => moc.id == id)[0];
    }
}
