import { Component, OnInit, Input } from '@angular/core';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { DataMockupService } from '../../services/data-mockup.service';
import { DataService } from '../../services/data.service';
import { File, Version, Moc } from '../classes';

@Component({
  selector: 'app-moc',
  templateUrl: './moc.component.html',
  styleUrls: ['./moc.component.sass']
})
export class MocComponent implements OnInit {

  private _defaultMoc: Moc = {
    id: 0,
    title: "Empty Moc",
    pictures: ["https://cdn.rebrickable.com/media/thumbs/mocs/moc-135248.jpg/1000x800.jpg?1673886137.049721", "https://bricksafe.com/files/SkySaac/omega/V1.1_3.png/750x600p.png"],
    parts: 0,
    dimensions: "0x0x0",
    scale: "0:0",
    designer: "no one",
    stability: "good",
    difficulty: "easy",
    lastupdate: "now",
    tags: ["tag"],
    related: [],
    description: "description",
    versions: [{ version: "V0", versionExtra: "extra", changelog: "-", files: [{ link: "http.cat", name: "file", desc: "description" }] }]
  };

  moc: Moc = this._defaultMoc;
  noError : boolean = true;
  id: number | null = null;

  constructor(private route: ActivatedRoute, private dataMockupService: DataMockupService, private dataService: DataService) { }

  ngOnInit() {
    this.route.paramMap.subscribe(paramMap => {

      this.id = Number(paramMap.get('id')) || 0;
      //refresh this moc
      console.log("MocComponent: Searching for MOC with ID: " + this.id);

      /*
      this.dataService.getMoc(this.id).subscribe({
        next: (v) => {this.noError = true;this.moc=v},
        error: (e) => {this.noError = false;console.error(e)}});
      */

      if (this.id != null && (Number(this.id) || 0)) {
        this.moc = this.dataMockupService.getMoc(this.id);
      }
      else {
        this.moc = this._defaultMoc;
      }

    });
  }

}
