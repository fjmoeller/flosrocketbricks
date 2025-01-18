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
      this.settings = this.retrieveInstructionSettingsFromLocalStorage();
    } else {
      this.settings = this.DEFAULT_PLACEHOLDER_EXPORT_COLOR;
    }
  }

  getInstructionSettings(): string {
    return this.settings;
  }

  setInstructionSettings(settings: string) {
    if (this.isLocalStorageSupported) {
      this.saveInstructionSettingsToLocalStorage(settings);
    }
    this.settings = settings;
  }

  resetInstructionSettings() {
    if (this.isLocalStorageSupported) {
      this.saveInstructionSettingsToLocalStorage(this.DEFAULT_PLACEHOLDER_EXPORT_COLOR);
    }
    this.settings = this.DEFAULT_PLACEHOLDER_EXPORT_COLOR;
  }

  private retrieveInstructionSettingsFromLocalStorage(): string {
    const saved = localStorage.getItem(this.LOCALSTORAGE_KEY);
    if(saved && saved !== "")
      return saved;
    else
      return this.DEFAULT_PLACEHOLDER_EXPORT_COLOR;
  }

  private saveInstructionSettingsToLocalStorage(settings: string) {
    localStorage.setItem(this.LOCALSTORAGE_KEY, JSON.stringify(settings));
  }
}
