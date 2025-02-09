import {Component, OnInit} from '@angular/core';
import {SelectComponent} from "../select/select.component";
import {ExportSettingsService} from "../../services/file/export-settings.service";
import {LdrawColorService} from "../../services/color/ldraw-color.service";

@Component({
  selector: 'app-export-settings',
  standalone: true,
  imports: [
    SelectComponent
  ],
  templateUrl: './export-settings.component.html',
  styleUrl: './export-settings.component.sass'
})
export class ExportSettingsComponent implements OnInit {

  colorReplacement: string = "";
  colorReplacementOptions: { value: string, label: string }[] = [];

  constructor(private exportSettingsService: ExportSettingsService, private ldrawColorService: LdrawColorService) {
    this.fillColorReplacements();
  }

  async ngOnInit() {
    this.colorReplacement = this.exportSettingsService.getExportSettings();
  }

  saveExportSettings(): void {
    this.exportSettingsService.setExportSettings(this.colorReplacement);
  }

  resetExportSettings(): void {
    this.exportSettingsService.resetExportSettings();
    this.colorReplacement = this.exportSettingsService.getExportSettings();
  }

  setColorReplacement(colorReplacement: { value: string, label: string }): void {
    this.colorReplacement = colorReplacement.value;
  }

  fillColorReplacements(): void {
    const notWantedColors = this.ldrawColorService.getNonsenseColors();
    let defaultColors = this.ldrawColorService.getColorNames()
      .filter(c => !notWantedColors.includes(c))
      .sort()
      .map(c => c.split("_").join(" "));

    this.colorReplacementOptions = [
      {
        value: "",
        label: "Don't replace"
      },
      {
        value: "Any Color",
        label: "Any Color"
      }
    ].concat(defaultColors.map(c => {
      return {value: c, label: c}
    }));
  }
}
