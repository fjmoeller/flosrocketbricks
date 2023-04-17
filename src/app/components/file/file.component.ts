import { Component, OnInit, Input } from '@angular/core';

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

  constructor() { }

  ngOnInit(): void {
  }

  downloadXml(): void {

  }

  openViewer(): void {

  }

  downloadCsv():void{
    
  }
}
