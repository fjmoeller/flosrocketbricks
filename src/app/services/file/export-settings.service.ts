import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ExportSettingsService {

  private readonly LOCALSTORAGE_KEY = 'export-settings';
  private readonly DEFAULT_PLACEHOLDER_EXPORT_COLOR: string = "";

  private settings: string;

  private readonly isLocalStorageSupported: boolean;

  constructor() {
    let storageSupported = false;
    try {
      storageSupported = (window.localStorage && true);
    } catch (e) {
    }
    this.isLocalStorageSupported = storageSupported;
    if (this.isLocalStorageSupported) {
      this.settings = this.retrieveExportSettingsFromLocalStorage();
    } else {
      this.settings = this.DEFAULT_PLACEHOLDER_EXPORT_COLOR;
    }
  }

  getExportSettings(): string {
    return this.settings;
  }

  setExportSettings(settings: string) {
    if (this.isLocalStorageSupported) {
      this.saveExportSettingsToLocalStorage(settings);
    }
    this.settings = settings;
  }

  resetExportSettings() {
    if (this.isLocalStorageSupported) {
      this.saveExportSettingsToLocalStorage(this.DEFAULT_PLACEHOLDER_EXPORT_COLOR);
    }
    this.settings = this.DEFAULT_PLACEHOLDER_EXPORT_COLOR;
  }

  private retrieveExportSettingsFromLocalStorage(): string {
    const saved = localStorage.getItem(this.LOCALSTORAGE_KEY);
    if(saved && JSON.parse(saved)!== "")
      return JSON.parse(saved);

    return this.DEFAULT_PLACEHOLDER_EXPORT_COLOR;
  }

  private saveExportSettingsToLocalStorage(settings: string) {
    localStorage.setItem(this.LOCALSTORAGE_KEY, JSON.stringify(settings));
  }
}
