import {Component, EventEmitter, OnInit, Output} from '@angular/core';
import {InstructionSettingsService} from "../../services/viewer/instruction-settings.service";
import {AutoShowBottom, InstructionSettings} from "../../model/instructions";
import {FormsModule} from "@angular/forms";
import {Color, Spherical} from "three";

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
  enableAxisHelper!: boolean;

  cameraZoomSpeed!: number;
  partListCameraZoomSpeed!: number;
  cameraMaxZoom!: number;
  partListMaxCameraZoom!: number;
  cameraMinZoom!: number;
  partListMinCameraZoom!: number;
  cameraRotationSpeed!: number;
  partListCameraRotationSpeed!: number;
  touchZoomEpsilon!: number;
  touchZoomSpeed!: number;

  panningSpeed!: number;
  resetTargetOnPageChange!: boolean;
  partListSmallPartScalingThreshold!: number;
  enablePartListSmallPartScaling!: boolean;

  defaultMainCameraPositionRadius!: number;
  defaultMainCameraPositionTheta!: number;
  defaultMainCameraPositionPhi!: number;
  defaultPartListCameraPositionRadius!: number;
  defaultPartListCameraPositionTheta!: number;
  defaultPartListCameraPositionPhi!: number;
  enableAutoZoom!: boolean;
  enableAutoRotation!: boolean;
  enableLongestOntoXAxisFlip!: boolean;
  autoShowBottom!: AutoShowBottom;
  autoShowBottomThreshold!: number;
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
  defaultAnyColor!: string;

  constructor(private instructionSettingsService: InstructionSettingsService) {
  }

  ngOnInit():void{
    this.setData(this.instructionSettingsService.getInstructionSettings());
  }

  setData(instructionSettings: InstructionSettings) {
    this.maxFps = instructionSettings.maxFps;
    this.enableAxisHelper = instructionSettings.enableAxisHelper;
    this.cameraZoomSpeed = instructionSettings.cameraZoomSpeed;
    this.partListCameraZoomSpeed = instructionSettings.partListCameraZoomSpeed;
    this.cameraMaxZoom = instructionSettings.cameraMaxZoom;
    this.partListMaxCameraZoom = instructionSettings.partListMaxCameraZoom;
    this.cameraMinZoom = instructionSettings.cameraMinZoom;
    this.partListMinCameraZoom = instructionSettings.partListMinCameraZoom;
    this.cameraRotationSpeed = instructionSettings.cameraRotationSpeed;
    this.partListCameraRotationSpeed = instructionSettings.partListCameraRotationSpeed;
    this.touchZoomEpsilon = instructionSettings.touchZoomEpsilon;
    this.touchZoomSpeed = instructionSettings.touchZoomSpeed;

    this.panningSpeed = instructionSettings.panningSpeed;
    this.resetTargetOnPageChange = instructionSettings.resetTargetOnPageChange;
    this.partListSmallPartScalingThreshold = instructionSettings.partListSmallPartScalingThreshold;
    this.enablePartListSmallPartScaling = instructionSettings.enablePartListSmallPartScaling;

    this.defaultMainCameraPositionRadius = instructionSettings.defaultMainCameraPosition.radius;
    this.defaultMainCameraPositionPhi = instructionSettings.defaultMainCameraPosition.phi;
    this.defaultMainCameraPositionTheta = instructionSettings.defaultMainCameraPosition.theta;
    this.defaultPartListCameraPositionRadius = instructionSettings.defaultPartListCameraPosition.radius;
    this.defaultPartListCameraPositionPhi = instructionSettings.defaultPartListCameraPosition.phi;
    this.defaultPartListCameraPositionTheta = instructionSettings.defaultPartListCameraPosition.theta;
    this.enableAutoZoom = instructionSettings.enableAutoZoom;
    this.enableAutoRotation = instructionSettings.enableAutoRotation;
    this.enableLongestOntoXAxisFlip = instructionSettings.enableLongestOntoXAxisFlip;
    this.autoShowBottom = instructionSettings.autoShowBottom;
    this.autoShowBottomThreshold = instructionSettings.autoShowBottomThreshold;
    this.minimalAutoZoom = instructionSettings.minimalAutoZoom;
    this.partListMinimalAutoZoom = instructionSettings.partListMinimalAutoZoom;
    this.autoZoomFactor = instructionSettings.autoZoomFactor;
    this.partListAutoZoomFactor = instructionSettings.partListAutoZoomFactor;

    this.mainBgColor = instructionSettings.mainBgColor;
    this.submodelIndicatorBgColor = instructionSettings.submodelIndicatorBgColor;
    this.partListBgColor = instructionSettings.partListBgColor;
    this.prevInterpolationColor = '#' + ('000000' + instructionSettings.prevInterpolationColor.getHex().toString(16)).slice(-6);
    this.prevInterpolationPercentage = instructionSettings.prevInterpolationPercentage;
    this.enableOutline = instructionSettings.enableOutline;
    this.defaultAnyColor = instructionSettings.defaultAnyColor;
  }

  save(): void {
    const newSettings: InstructionSettings = {
      maxFps: this.maxFps,
      enableAxisHelper: this.enableAxisHelper,

      cameraZoomSpeed: this.cameraZoomSpeed,
      partListCameraZoomSpeed: this.partListCameraZoomSpeed,
      cameraMaxZoom: this.cameraMaxZoom,
      partListMaxCameraZoom: this.partListMaxCameraZoom,
      cameraMinZoom: this.cameraMinZoom,
      partListMinCameraZoom: this.partListMinCameraZoom,
      cameraRotationSpeed: this.cameraRotationSpeed,
      partListCameraRotationSpeed: this.partListCameraRotationSpeed,
      touchZoomEpsilon: this.touchZoomEpsilon,
      touchZoomSpeed: this.touchZoomSpeed,

      panningSpeed: this.panningSpeed,
      resetTargetOnPageChange: this.resetTargetOnPageChange,
      partListSmallPartScalingThreshold: this.partListSmallPartScalingThreshold,
      enablePartListSmallPartScaling: this.enablePartListSmallPartScaling,

      defaultMainCameraPosition: new Spherical(this.defaultMainCameraPositionRadius, this.defaultMainCameraPositionPhi, this.defaultMainCameraPositionTheta),
      defaultPartListCameraPosition: new Spherical(this.defaultPartListCameraPositionRadius, this.defaultPartListCameraPositionPhi, this.defaultPartListCameraPositionTheta),
      enableAutoZoom: this.enableAutoZoom,
      enableAutoRotation: this.enableAutoRotation,
      enableLongestOntoXAxisFlip: this.enableLongestOntoXAxisFlip && this.enableAutoRotation,
      autoShowBottom: this.autoShowBottom,
      autoShowBottomThreshold: this.autoShowBottomThreshold,
      minimalAutoZoom: this.minimalAutoZoom,
      partListMinimalAutoZoom: this.partListMinimalAutoZoom,
      autoZoomFactor: this.autoZoomFactor,
      partListAutoZoomFactor: this.partListAutoZoomFactor,

      mainBgColor: this.mainBgColor,
      submodelIndicatorBgColor: this.submodelIndicatorBgColor,
      partListBgColor: this.partListBgColor,
      prevInterpolationColor: new Color(this.prevInterpolationColor),
      prevInterpolationPercentage: this.prevInterpolationPercentage,
      enableOutline: this.enableOutline,
      defaultAnyColor: this.defaultAnyColor
    };

    this.instructionSettingsService.setInstructionSettings(newSettings);
    this.settingsChanged.emit();
  }

  reset(): void {
    this.instructionSettingsService.resetInstructionSettings();
    this.setData(this.instructionSettingsService.getInstructionSettings());
    this.settingsChanged.emit();
  }


  protected readonly AutoShowBottom = AutoShowBottom;
}
