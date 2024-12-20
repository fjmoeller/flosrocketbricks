import {Component, EventEmitter, Inject, OnInit, Output, PLATFORM_ID} from '@angular/core';
import {InstructionSettingsService} from "../../services/viewer/instruction-settings.service";
import {InstructionSettings} from "../../model/instructions";
import {isPlatformBrowser} from "@angular/common";
import {FormsModule} from "@angular/forms";
import {Color} from "three";

@Component({
  selector: 'app-instruction-settings',
  standalone: true,
  imports: [
    FormsModule
  ],
  templateUrl: './instruction-settings.component.html',
  styleUrl: './instruction-settings.component.sass'
})
export class InstructionSettingsComponent implements OnInit {

  @Output()
  settingsChanged: EventEmitter<void> = new EventEmitter();

  maxFps!: number;

  cameraZoomSpeed!: number;
  partListCameraZoomSpeed!: number;
  cameraMaxZoom!: number;
  partListMaxCameraZoom!: number;
  cameraMinZoom!: number;
  partListMinCameraZoom!: number;
  cameraRotationSpeed!: number;
  partListCameraRotationSpeed!: number;

  panningSpeed!: number;
  resetTargetOnPageChange!: boolean;
  partListSmallPartScalingThreshold!: number;
  enablePartListSmallPartScaling!: boolean;

  enableAutoZoom!: boolean;
  enableAutoRotation!: boolean;
  minimalAutoZoom!: number;
  partListMinimalAutoZoom!: number;
  autoZoomFactor!: number;
  partListAutoZoomFactor!: number;

  mainBgColor!: string;
  submodelIndicatorBgColor!: string;
  partListBgColor!: string;
  prevInterpolationColor!: string;
  prevInterpolationPercentage!: number;
  enableOutline!: boolean;

  constructor(@Inject(PLATFORM_ID) private platformId: Object, private instructionSettingsService: InstructionSettingsService) {
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId))
      this.reset();
  }

  setData(instructionSettings: InstructionSettings) {
    this.maxFps = instructionSettings.maxFps;
    this.cameraZoomSpeed = instructionSettings.cameraZoomSpeed;
    this.partListCameraZoomSpeed = instructionSettings.partListCameraZoomSpeed;
    this.cameraMaxZoom = instructionSettings.cameraMaxZoom;
    this.partListMaxCameraZoom = instructionSettings.partListMaxCameraZoom;
    this.cameraMinZoom = instructionSettings.cameraMinZoom;
    this.partListMinCameraZoom = instructionSettings.partListMinCameraZoom;
    this.cameraRotationSpeed = instructionSettings.cameraRotationSpeed;
    this.partListCameraRotationSpeed = instructionSettings.partListCameraRotationSpeed;

    this.panningSpeed = instructionSettings.panningSpeed;
    this.resetTargetOnPageChange = instructionSettings.resetTargetOnPageChange;
    this.partListSmallPartScalingThreshold = instructionSettings.partListSmallPartScalingThreshold;
    this.enablePartListSmallPartScaling = instructionSettings.enablePartListSmallPartScaling;

    this.enableAutoZoom = instructionSettings.enableAutoZoom;
    this.enableAutoRotation = instructionSettings.enableAutoRotation;
    this.minimalAutoZoom = instructionSettings.minimalAutoZoom;
    this.partListMinimalAutoZoom = instructionSettings.partListMinimalAutoZoom;
    this.autoZoomFactor = instructionSettings.autoZoomFactor;
    this.partListAutoZoomFactor = instructionSettings.partListAutoZoomFactor;

    this.mainBgColor = instructionSettings.mainBgColor;
    this.submodelIndicatorBgColor = instructionSettings.submodelIndicatorBgColor;
    this.partListBgColor = instructionSettings.partListBgColor;
    this.prevInterpolationColor = '#'+('000000'+instructionSettings.prevInterpolationColor.getHex().toString(16)).slice(-6);
    this.prevInterpolationPercentage = instructionSettings.prevInterpolationPercentage;
    this.enableOutline = instructionSettings.enableOutline;
  }

  save(): void {
    const newSettings: InstructionSettings = {
      maxFps: this.maxFps,

      cameraZoomSpeed: this.cameraZoomSpeed,
      partListCameraZoomSpeed: this.partListCameraZoomSpeed,
      cameraMaxZoom: this.cameraMaxZoom,
      partListMaxCameraZoom: this.partListMaxCameraZoom,
      cameraMinZoom: this.cameraMinZoom,
      partListMinCameraZoom: this.partListMinCameraZoom,
      cameraRotationSpeed: this.cameraRotationSpeed,
      partListCameraRotationSpeed: this.partListCameraRotationSpeed,

      panningSpeed: this.panningSpeed,
      resetTargetOnPageChange: this.resetTargetOnPageChange,
      partListSmallPartScalingThreshold: this.partListSmallPartScalingThreshold,
      enablePartListSmallPartScaling: this.enablePartListSmallPartScaling,

      enableAutoZoom: this.enableAutoZoom,
      enableAutoRotation: this.enableAutoRotation,
      minimalAutoZoom: this.minimalAutoZoom,
      partListMinimalAutoZoom: this.partListMinimalAutoZoom,
      autoZoomFactor: this.autoZoomFactor,
      partListAutoZoomFactor: this.partListAutoZoomFactor,

      mainBgColor: this.mainBgColor,
      submodelIndicatorBgColor: this.submodelIndicatorBgColor,
      partListBgColor: this.partListBgColor,
      prevInterpolationColor: new Color(this.prevInterpolationColor),
      prevInterpolationPercentage: this.prevInterpolationPercentage,
      enableOutline: this.enableOutline
    };

    this.instructionSettingsService.setInstructionSettings(newSettings);
    this.settingsChanged.emit();
  }

  reset(): void {
    this.instructionSettingsService.resetInstructionSettings();
    this.setData(this.instructionSettingsService.getInstructionSettings());
    this.settingsChanged.emit();
  }


}
