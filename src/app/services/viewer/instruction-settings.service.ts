import {Inject, Injectable, PLATFORM_ID} from '@angular/core';
import {InstructionSettings} from "../../model/instructions";
import {Color} from "three";
import {isPlatformBrowser} from "@angular/common";

@Injectable({
  providedIn: 'root'
})
export class InstructionSettingsService {

  private readonly LOCALSTORAGE_KEY = 'instruction-settings';

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
  }

  getInstructionSettings(): InstructionSettings {
    if (isPlatformBrowser(this.platformId)) {
      const saved: string | null = localStorage.getItem(this.LOCALSTORAGE_KEY);
      if (saved !== null){
        return JSON.parse(saved, (key, value) => {
          return key === "prevInterpolationColor" ? new Color(value) : value;
        }) as InstructionSettings;
      }

    }
    return this.getDefaultInstructionSettings();
  }

  setInstructionSettings(settings: InstructionSettings) {
    localStorage.setItem(this.LOCALSTORAGE_KEY, JSON.stringify(settings));
  }

  resetInstructionSettings() {
    localStorage.setItem(this.LOCALSTORAGE_KEY, JSON.stringify(this.getDefaultInstructionSettings()));
  }

  private getDefaultInstructionSettings(): InstructionSettings {
    return {
      maxFps: 60,

      cameraZoomSpeed: 0.0005,
      partListCameraZoomSpeed: 0.0005,
      cameraMaxZoom: 0.05,
      partListMaxCameraZoom: 0.05,
      cameraMinZoom: 1000,
      partListMinCameraZoom: 1000,
      cameraRotationSpeed: 0.01,
      partListCameraRotationSpeed: 0.02,

      panningSpeed: 50, //low -> faster
      resetTargetOnPageChange: true,
      partListSmallPartScalingThreshold: 44, //how big a part must be so that it gets a container width of 6rem instead of 3rem
      enablePartListSmallPartScaling: true,

      enableAutoZoom: true,
      enableAutoRotation: true,
      minimalAutoZoom: 4, //high -> further away
      partListMinimalAutoZoom: 7, //high -> further away
      autoZoomFactor: 1.7, //high -> further away
      partListAutoZoomFactor: 1.1, //high -> further away

      mainBgColor: "#586575",
      submodelIndicatorBgColor: "#D2B48C",
      partListBgColor: "#B0C4DE",
      prevInterpolationColor: new Color(0.344, 0.394, 0.457),
      prevInterpolationPercentage: 0.7,
      enableOutline: false,
    };
  }

}
