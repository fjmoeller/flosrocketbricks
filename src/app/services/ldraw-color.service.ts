import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { LdrColor } from '../model/ldrawParts';
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
        const name = line.substring(10, 64).trim().replace("_", " ");
        const code = parseInt(line.substring(69, 72).trim());
        const hex = line.substring(81, 88);
        const edge = line.substring(96, 103);
        const alpha = Number(line.substring(112, 115)) || 0;
        const material = line.substring(134);
        this.ldrColorList.set(code, new LdrColor(name, hex, edge, code, alpha, material));
      }
    }
  }

  resolveColor(id: number): { color: ColorRepresentation, emissive: Color, opacity: number, metalness: number, roughness: number, transparent: boolean } {

    const ldrcolor = this.ldrColorList.get(id);

    const finalColor = this.getSimpleColor(id);
    const opacity = ldrcolor ? ldrcolor.alpha / 255 : 0.0;
    const transparent = opacity > 0.001;

    let metal = 0.0;
    let roughness = 0.8;
    let emissive = new Color("#000000");
    if (ldrcolor) {
      switch (ldrcolor.material) {
        case "METAL": metal = 0.6; roughness = 0.2; emissive = finalColor; break;
        case "CHROME": metal = 0.7; roughness = 0.0; emissive = finalColor; break;
        case "PEARLESCENT": metal = 0.2; roughness = 0.5; emissive = finalColor; break;
      }
    }

    return { color: finalColor, opacity: opacity, metalness: metal, emissive: emissive, roughness: roughness, transparent: transparent }
  }

  getSimpleColor(id: number): Color {
    const ldrcolor = this.ldrColorList.get(id);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(ldrcolor?.hex ?? "#fff000");
    if (result) {
      let res = {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
      return new Color(res.r / 255, res.g / 255, res.b / 255);
    }
    return new Color("#fff000");
  }
}
