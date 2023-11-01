import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { LdrColor } from '../../model/ldrawParts';
import { Color } from 'three';
import rebr_colors from '../../../assets/ldr/lists/rebr_colors.json';

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
        const code = parseInt(line.substring(69, 73).trim());
        const hex = line.substring(81, 88);
        const edge = line.substring(96, 103);
        const alpha = Number(line.substring(112, 115)) || 0;
        const material = line.substring(134);
        this.ldrColorList.set(code, new LdrColor(name, hex, edge, code, alpha, material));
      }
    }
  }

  getPlaceholderColorCode(colorName: string): number {
    for (let key of this.ldrColorList.keys()) {
      if (this.ldrColorList.get(key)?.name == colorName) {
        return key;
      }
    }
    return -1;
  }

  resolveColor(id: number) {
    const ldrcolor = this.ldrColorList.get(id);

    const finalColor = this.getSimpleColor(id);
    const opacity = ldrcolor ? ldrcolor.alpha / 255 : 0.0;
    const transparent = opacity > 0.001;

    let roughness = 0.8;
    if (ldrcolor) {
      switch (ldrcolor.material) {
        case "CHROME": return { metalness: 0.7, roughness: 0.1, emissive: new Color(finalColor.r - 0.1, finalColor.g - 0.1, finalColor.b - 0.1), color: finalColor, opacity: opacity, transparent: transparent };
        case "PEARLESCENT": return { metalness: 0.9, roughness: 0.7, emissive: new Color(finalColor.r + 0.05, finalColor.g + 0.05, finalColor.b + 0.05), color: finalColor, opacity: opacity, transparent: transparent };
        case "METAL": return { metalness: 0.3, roughness: 0.5, emissive: new Color(finalColor.r - 0.10, finalColor.g - 0.10, finalColor.b - 0.10), color: finalColor, opacity: opacity, transparent: transparent };
      }
    }
    return { color: finalColor, opacity: opacity, roughness: roughness, transparent: transparent }
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

  getBricklinkColorOf(ldrawIdString: string): number {
    const ldrawId = Number(ldrawIdString);

    let foundColors = rebr_colors.filter(color => color.external_ids.LDraw?.ext_ids.includes(ldrawId));

    if(foundColors.length != 1)
      console.log("Error finding color %s",ldrawIdString);

    return foundColors[0].external_ids.BrickLink?.ext_ids[0] ?? -1;
  }
}
