import { Injectable } from '@angular/core';
import { Group } from 'three';
import * as zip from "@zip.js/zip.js";

@Injectable({
  providedIn: 'root'
})
export class FileExportService {

  private backendFetchUrl: string = "https://wandering-breeze-a826.flomodoyt1960.workers.dev/viewer/?apiurl=";

  constructor() { }

  async getModel(url: string): Promise<Group> {
    console.log("Fetching MOC:", this.backendFetchUrl + url);
    const contents = await fetch(this.backendFetchUrl + url);
    let ldrFile = await this.extractLdrFile(contents);
    return new Group();
  }

  //This functions extract the to be used ldr file from io file
  async extractLdrFile(file: any): Promise<string> {
    try {
      const blob = await file.blob();
      const options = { password: "soho0909", filenameEncoding: "utf-8" };
      const entries = await (new zip.ZipReader(new zip.BlobReader(blob), options)).getEntries();
      const model = entries.find(e => e.filename === "model.ldr");
      if (model) {
        const decompressedBlob = await model.getData(new zip.BlobWriter());
        return decompressedBlob.text();
      }
      return "";
    } catch (e) {
      console.log(e);
      return "";
    }
  }

  getCsv(){

  }

  getXml(){

  }
}
