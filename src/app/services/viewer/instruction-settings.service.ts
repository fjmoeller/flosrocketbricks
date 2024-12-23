import {Injectable} from '@angular/core';
import {AutoShowBottom, InstructionSettings} from "../../model/instructions";
import {Color, Spherical} from "three";

@Injectable({
    providedIn: 'root'
})
export class InstructionSettingsService {

    private readonly LOCALSTORAGE_KEY = 'instruction-settings';

    private settings: InstructionSettings;

    private readonly isLocalStorageSupported: boolean;

    constructor() {
        let storageSupported = false;
        try {
            storageSupported = (window.localStorage && true);
        } catch (e) {
        }
        this.isLocalStorageSupported = storageSupported;
        if (this.isLocalStorageSupported) {
            this.settings = this.retrieveInstructionSettingsFromLocalStorage();
        } else {
            this.settings = this.getDefaultInstructionSettings();
        }
    }

    getInstructionSettings(): InstructionSettings {
        return this.settings;
    }

    setInstructionSettings(settings: InstructionSettings) {
        if (this.isLocalStorageSupported) {
            this.saveInstructionSettingsToLocalStorage(settings);
        }
        this.settings = settings;
    }

    resetInstructionSettings() {
        if (this.isLocalStorageSupported) {
            this.saveInstructionSettingsToLocalStorage(this.getDefaultInstructionSettings());
        }
        this.settings = this.getDefaultInstructionSettings();
    }

    private retrieveInstructionSettingsFromLocalStorage(): InstructionSettings {
        const saved: string | null = localStorage.getItem(this.LOCALSTORAGE_KEY);
        if (saved) {
            return JSON.parse(saved, (key, value) => {
                switch (key) {
                    case "prevInterpolationColor":
                        return new Color(value);
                    case "defaultMainCameraPosition":
                        return new Spherical(value.radius, value.phi, value.theta);
                    case "defaultPartListCameraPosition":
                        return new Spherical(value.radius, value.phi, value.theta);
                    default:
                        return value;
                }
            }) as InstructionSettings;
        } else {
            return this.getDefaultInstructionSettings();
        }
    }

    private saveInstructionSettingsToLocalStorage(settings: InstructionSettings) {
        localStorage.clear();
        localStorage.setItem(this.LOCALSTORAGE_KEY, JSON.stringify(settings));
    }

    private getDefaultInstructionSettings(): InstructionSettings {
        return {
            maxFps: 60,
            enableAxisHelper: true,

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

            defaultMainCameraPosition: new Spherical(1, 1, 2.6),
            defaultPartListCameraPosition: new Spherical(1, 1, 1),
            enableAutoZoom: true,
            enableAutoRotation: true,
            enableLongestOntoXAxisFlip: false,
            autoShowBottom: AutoShowBottom.ROTATE,
            autoShowBottomThreshold: -0.17,
            minimalAutoZoom: 4, //high -> further away
            partListMinimalAutoZoom: 7, //high -> further away
            autoZoomFactor: 1.7, //high -> further away
            partListAutoZoomFactor: 1.1, //high -> further away

            touchZoomEpsilon:0.1,

            mainBgColor: "#586575",
            submodelIndicatorBgColor: "#D2B48C",
            partListBgColor: "#B0C4DE",
            prevInterpolationColor: new Color(0.344, 0.394, 0.457),
            prevInterpolationPercentage: 0.7,
            enableOutline: false,
        };
    }

}
