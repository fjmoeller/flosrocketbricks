import { Injectable } from '@angular/core';
import { LdrColor } from '../../model/ldrawParts';
import { Color } from 'three';
import rebr_colors from '../../../assets/ldr/lists/rebr_colors.json';
import color_definitions from '../../../assets/ldr/lists/color_definitions.json'

@Injectable({
  providedIn: 'root'
})
export class LdrawColorService {

  private ldrColorList = new Map<number, LdrColor>;

  constructor() {
    for (let def of color_definitions) {
      this.ldrColorList.set(def.code, new LdrColor(def.name, def.hex, def.edge, def.code, def.alpha, def.material));
    }
  }

  getLdrawColorIdByColorName(colorName: string): number {
    if (colorName === "-") return -1;
    const noSpaceColorName = colorName.replace(" ","_");
    for (let key of this.ldrColorList.keys()) {
      if (this.ldrColorList.get(key)?.name === noSpaceColorName) {
        return key;
      }
    }
    console.error("Error finding color id by name: %s", colorName);
    return -1;
  }

  getLdrawColorNameByColorId(colorId: number): string {
    const color = this.ldrColorList.get(colorId);
    if(color)
      return color.name;
    else
      return "";
  }

  resolveColorByLdrawColorId(id: number) {
    const ldrcolor = this.ldrColorList.get(id);
    const finalColor = this.getHexColorFromLdrawColorId(id);
    const opacity = ldrcolor ? ldrcolor.alpha / 255 : 0.0;
    const transparent = opacity < 0.999;
    const roughness = 0.8;

    if (ldrcolor)
      switch (ldrcolor.material) {
        case "CHROME": return { metalness: 1, roughness: 0.1, emissive: new Color(finalColor.r - 0.1, finalColor.g - 0.1, finalColor.b - 0.1), color: finalColor, opacity: opacity, transparent: transparent };
        case "PEARLESCENT": return { metalness: 0.3, roughness: 0.4, emissive: new Color(finalColor.r - 0.2, finalColor.g - 0.2, finalColor.b - 0.2), color: finalColor, opacity: opacity, transparent: transparent };
        case "METAL": return { metalness: 1, roughness: 0.3, emissive: new Color(finalColor.r - 0.1, finalColor.g - 0.1, finalColor.b - 0.1), color: finalColor, opacity: opacity, transparent: transparent };
      }
    return { color: finalColor, opacity: opacity, roughness: roughness, transparent: transparent}
  }

  getHexColorFromLdrawColorId(id: number): Color {
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
    console.error("Error finding color %d", id);
    return new Color("#fff000");
  }

  getBricklinkColorIdByLdrawColorId(ldrawIdString: string, defaultColor: number): number {
    const ldrawId = Number(ldrawIdString);

    let foundColors = rebr_colors.filter(color => color.external_ids.LDraw?.ext_ids.includes(ldrawId));

    if (foundColors.length != 1)
      console.error("Error finding color %s", ldrawIdString);

    return foundColors[0].external_ids.BrickLink?.ext_ids[0] ?? defaultColor;
  }

  getRebrickableColorIdByLdrawColorId(ldrawIdString: string, defaultColor: number): number {
    const ldrawId = Number(ldrawIdString);

    let foundColors = rebr_colors.filter(color => color.external_ids.LDraw?.ext_ids.includes(ldrawId));

    if (foundColors.length != 1)
      console.error("Error finding color %s", ldrawIdString);

    return foundColors[0].id ?? defaultColor;
  }
}
