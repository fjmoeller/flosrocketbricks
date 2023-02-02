import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-file',
  templateUrl: './file.component.html',
  styleUrls: ['./file.component.sass']
})
export class FileComponent implements OnInit {

  @Input('link') filelink = ""
  @Input('name') filename="V2.6.io"
  @Input('description') description="this is a file"
  
  constructor() { }

  ngOnInit(): void {
  }

}
