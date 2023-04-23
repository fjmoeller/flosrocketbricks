import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-file',
  templateUrl: './file.component.html',
  styleUrls: ['./file.component.sass']
})
export class FileComponent implements OnInit {

  @Input('link') filelink = "";
  @Input('name') filename = "";
  @Input('description') description = "";
  @Input('type') type = "";
  @Input('viewerAllowed') viewerAllowed = false;

  @Output() viewerEvent = new EventEmitter<string>();

  constructor() { }

  ngOnInit(): void {
  }

  downloadXml(): void {

  }

  openViewer(): void {
    this.viewerEvent.emit(this.filelink);
  }

  downloadCsv():void{
  }
}
