import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { LdrColor } from './ldrawParts';
import { Color, ColorRepresentation } from 'three';

@Injectable({
  providedIn: 'root'
})
export class LdrawColorService {

  private ldrColorList = new Map<number, LdrColor>;

  constructor(private httpClient: HttpClient) {
    this.httpClient.get('assets/ldr/lists/LDConfig.ldr', { responseType: 'text' })
      .subscribe(data => this.parseColors(data.split("\r").join('').split('\n')));
  }

  private parseColors(text: string[]) {
    for (const line of text) {
      if (line.startsWith("0 !COLOUR")) {
        let name = line.substring(10, 64).trim().replace("_", " ");
        let code = parseInt(line.substring(69, 72).trim());
        let hex = line.substring(81, 88);
        let edge = line.substring(96, 103);
        this.ldrColorList.set(code, new LdrColor(name, hex, edge, code));
      }
    }
    console.log("Initital color parsing done: "+this.ldrColorList.size+" colors found");
  }

  resolveColor(id: number): ColorRepresentation {
    //console.log("Resolving color: "+id);
    let color = this.ldrColorList.get(id)?.hex;
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color ? color : "#fffff0");
    if (result) {
      let res = {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
      return new Color(res.r/255, res.g/255, res.b/255);
    }
    return new Color("#fff000");
  }
}
