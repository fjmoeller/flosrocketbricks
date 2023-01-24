import { Component, OnInit, Input } from '@angular/core';

import { File } from "../classes";

@Component({
  selector: 'app-versionfile',
  templateUrl: './versionfile.component.html',
  styleUrls: ['./versionfile.component.sass']
})
export class VersionfileComponent implements OnInit {

  @Input('version') version = "V2.6"
  @Input('versionExtra') versionExtra = "nothing"
  @Input('changelog') changelog = "changelog here"
  @Input('files') files : File[]


  constructor() {
    this.files = []
  }

  ngOnInit(): void {
  }

}
