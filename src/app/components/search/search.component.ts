import { Component, OnInit } from '@angular/core';
import { FrontTag, Moc } from '../classes';
import { map, Observable } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { MocGrabberService } from 'src/app/services/moc-grabber.service';
import { MetaServiceService } from 'src/app/services/meta-service.service';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.sass']
})
export class SearchComponent implements OnInit {

  searchInput: string = "";

  sortingCategory: string = "Date";
  sortingDirection: number = 1;

  static Tag = class {
    tagIdentifier: string = "";
    tagTitle: string = "";
  }

  tagRegions: FrontTag[] = [{ tagId: "", tagName: "All Regions" }, { tagId: "China", tagName: "China" }, { tagId: "Europe", tagName: "Europe" }, { tagId: "Japan", tagName: "Japan" }, { tagId: "New Zeeland", tagName: "New Zeeland" }, { tagId: "Russia", tagName: "Russia" }, { tagId: "South Korea", tagName: "South Korea" }, { tagId: "Ukraine", tagName: "Ukraine" }, { tagId: "USA", tagName: "Usa" }];
  tagTypes: FrontTag[] = [{ tagId: "", tagName: "All Types" }, { tagId: "rocket", tagName: "Rocket" }, { tagId: "launchpad", tagName: "Launchpad" }, { tagId: "spacecraft", tagName: "Spacecraft" }, { tagId: "spacestation", tagName: "Spacestation" }, { tagId: "other", tagName: "Other" }];
  tagScales: FrontTag[] = [{ tagId: "", tagName: "All Scales" }, { tagId: "110", tagName: "1:110" }];

  tagRegion: string = "";
  tagType: string = "";
  tagScale: string = "";
  mocs!: Observable<Moc[]>;

  constructor(private metaService: MetaServiceService, private mocGrabberService: MocGrabberService, private route: ActivatedRoute) { }

  ngOnInit(): void {
    this.route.queryParams
      .subscribe(params => {
        if (params['q']) {
          this.searchInput = params['q'];
        }
        if (params['type']) {
          this.tagType = params['type'];
        }
        else if (params['region']) {
          this.tagRegion = params['region'];
        }
        else if (params['scale']) {
          this.tagScale = params['scale'];
        }
        this.getMocs();
      });
    this.metaService.setDefaultTags("Search - FlosRocketBricks", "https://flosrocketbricks.com/search");
  }

  changeSorting(category: string): void {
    this.sortingCategory = category;
    console.log("changed sorting category to:",this.sortingCategory)
    this.getMocs();
  }

  changeSortingDirection(): void {
    this.sortingDirection *= -1;
    console.log("changed sorting direction to:",this.sortingDirection)
    this.getMocs();
  }

  getMocs(): void {
    console.log("sorting to: "+this.sortingCategory+" with direction: "+this.sortingDirection);
    let tempMocs: Observable<Moc[]> = this.mocGrabberService.getAllMocs();

    if (this.tagRegion != "") {
      tempMocs = tempMocs.pipe(map((mocs: Moc[]) => mocs.filter((moc: Moc) => moc.region == this.tagRegion)));
    }
    if (this.tagType != "") {
      tempMocs = tempMocs.pipe(map((mocs: Moc[]) => mocs.filter((moc: Moc) => moc.type == this.tagType)));
    }
    if (this.tagScale != "") {
      tempMocs = tempMocs.pipe(map((mocs: Moc[]) => mocs.filter((moc: Moc) => moc.scale == this.tagScale)));
    }
    if (this.searchInput != "") {
      tempMocs = tempMocs.pipe(map((mocs: Moc[]) => mocs.filter((moc: Moc) => moc.title.toLowerCase().indexOf(this.searchInput.toLowerCase()) >= 0)));
    }

    switch (this.sortingCategory) {
      case "Date": tempMocs = tempMocs.pipe(map((mocs: Moc[]) => mocs.sort((a: Moc, b: Moc) => this.sortingDirection * (b.dateCreated > a.dateCreated ? 1 : -1)))); break;
      case "Title": tempMocs = tempMocs.pipe(map((mocs: Moc[]) => mocs.sort((a: Moc, b: Moc) => this.sortingDirection * (b.title > a.title ? 1 : -1)))); break;
      case "Parts": tempMocs = tempMocs.pipe(map((mocs: Moc[]) => mocs.sort((a: Moc, b: Moc) => this.sortingDirection * (b.parts > a.parts ? 1 : -1)))); break;
    }

    this.mocs = tempMocs;
  }

  tagTypeChange(val: string): void {
    this.tagType = val;
    console.log("change to", val);
    this.getMocs();
  }

  tagRegionChange(val: string): void {
    this.tagRegion = val;
    this.getMocs();
  }

  tagScaleChange(val: string): void {
    this.tagScale = val;
    this.getMocs();
  }
}
