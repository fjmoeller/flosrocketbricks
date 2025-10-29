import {Injectable} from '@angular/core';
import {LdrColor} from '../../model/ldrawParts';
import {Color} from 'three';
import rebr_colors from '../../../assets/ldr/lists/rebr_colors.json';
import color_definitions from '../../../assets/ldr/lists/color_definitions.json'

@Injectable({
  providedIn: 'root'
})
export class LdrawColorService {

  private ldrColorList = new Map<number, LdrColor>;
  private readonly anyColor: LdrColor = new LdrColor("Any Color", "#CD6298", "000000", 9999, 255, "");

  constructor() {
    for (let def of color_definitions) {
      this.ldrColorList.set(def.code, new LdrColor(def.name, def.hex, def.edge, def.code, def.alpha, def.material));
    }
  }

  getColorNames(): string[] {
    return [...this.ldrColorList.values()].map(e => e.name);
  }

  getNonsenseColors(): string[] {
    return ["Trans_Sticker", "Electric_Contact_Copper", "Electric_Contact_Alloy", "Magnet", "Edge_Colour", "Main_Colour"];
  }

  getLdrawColorIdByColorName(colorName: string): number {
    if (colorName === "-" || colorName === "") return -1;
    const noSpaceColorName = colorName.replace(" ", "_");
    for (let key of this.ldrColorList.keys()) {
      if (this.ldrColorList.get(key)?.name === noSpaceColorName) {
        return key;
      }
    }
    console.warn("Error finding color id by name: %s", colorName);
    return -1;
  }

  getLdrawColorByColorId(colorId: number): LdrColor {
    return this.ldrColorList.get(colorId) ?? this.anyColor;
  }

  resolveColorByLdrawColorId(id: number, defaultColor?: Color) {
    const ldrColor = this.ldrColorList.get(id);
    const finalColor: Color = this.getHexColorFromLdrawColorId(id, defaultColor);
    const opacity: number = ldrColor ? ldrColor.alpha / 255 : 1.0;
    const transparent: boolean = opacity < 0.999;
    const roughness = 0.8;

    if (ldrColor)
      switch (ldrColor.material) {
        case "CHROME":
          return {
            metalness: 1,
            roughness: 0.1,
            emissive: new Color(finalColor.r - 0.1, finalColor.g - 0.1, finalColor.b - 0.1),
            color: finalColor,
            opacity: opacity,
            transparent: transparent
          };
        case "PEARLESCENT":
          return {
            metalness: 0.2,
            roughness: 0.5,
            emissive: new Color(0.05, 0.05, 0.05),
            color: finalColor,
            opacity: opacity,
            transparent: transparent
          };
        case "METAL":
          return {
            metalness: 1,
            roughness: 0.3,
            emissive: new Color(finalColor.r - 0.1, finalColor.g - 0.1, finalColor.b - 0.1),
            color: finalColor,
            opacity: opacity,
            transparent: transparent
          };
      }
    return {color: finalColor, opacity: opacity, roughness: roughness, transparent: transparent}
  }

  getHexColorFromLdrawColorId(id: number, defaultColor?: Color): Color {
    const ldrColor = this.ldrColorList.get(id);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(ldrColor?.hex ?? "#fff000");
    if (ldrColor && result) {
      let res = {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
      return new Color(res.r / 255, res.g / 255, res.b / 255);
    }
    if (defaultColor)
      return defaultColor;
    console.warn("Error finding color ldraw:%d", id);
    return new Color("#f224d3");
  }

  getBricklinkColorIdByLdrawColorId(ldrawId: number, defaultColor: number): number {

    const foundColors = rebr_colors.filter(color => color.external_ids.LDraw?.ext_ids.includes(ldrawId));

    if (foundColors.length != 1) {
      console.log(foundColors);
    }

    return foundColors[0]?.external_ids.BrickLink?.ext_ids[0] ?? defaultColor;
  }

  getLdrawColorIdByBricklinkColorId(brickLinkId: number): number {
    const foundColors = rebr_colors.filter(color => color.external_ids.BrickLink?.ext_ids.includes(brickLinkId));

    return (foundColors[0]?.external_ids.LDraw?.ext_ids[0]) ?? 9999;
  }

  getRebrickableColorIdByLdrawColorId(ldrawIdString: string, defaultColor: number): number {
    const ldrawId = Number(ldrawIdString);

    const foundColors = rebr_colors.filter(color => color.external_ids.LDraw?.ext_ids.includes(ldrawId));

    if (foundColors.length != 1) {
      console.warn("Error finding color ldraw:%s", ldrawIdString);
      console.log(foundColors);
    }

    return foundColors[0]?.id ?? defaultColor;
  }
}
