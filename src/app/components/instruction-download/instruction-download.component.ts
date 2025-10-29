import {Component, Input} from '@angular/core';
import {MocFile} from "../../model/classes";
import {FileExportService} from "../../services/file/file-export.service";

@Component({
  selector: 'app-instruction-download',
  standalone: true,
  imports: [],
  templateUrl: './instruction-download.component.html',
  styleUrl: './instruction-download.component.sass'
})
export class InstructionDownloadComponent {
  @Input()
  file: MocFile;

  @Input()
  internalColor?: string;

  constructor(private fileExportService: FileExportService) {
    this.file = {
      link:"",
      type:"",
      export:false,
      name:"",
      description:"",
    };
  }

  async downloadXml() {
    const data = await this.fileExportService.getXml(this.file.link, this.internalColor ?? "");
    const blob = new Blob([data], {type: 'application/xml'});
    const a = document.createElement('a');
    a.href = window.URL.createObjectURL(blob);
    a.download = this.file.name.split(".io")[0] + ".xml";
    a.click();
    window.URL.revokeObjectURL(a.href);
  }

  async downloadCsv() {
    const data = await this.fileExportService.getCsv(this.file.link, this.internalColor ?? "");
    const blob = new Blob([data], {type: 'text/csv'});
    const a = document.createElement('a');
    a.href = window.URL.createObjectURL(blob);
    a.download = this.file.name.split(".io")[0] + ".csv";
    a.click();
    window.URL.revokeObjectURL(a.href);
  }
}
