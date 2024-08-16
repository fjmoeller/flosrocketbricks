import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { FrontTag, Moc } from '../../model/classes';
import { ActivatedRoute, Router } from '@angular/router';
import { MocGrabberService } from 'src/app/services/grabber/moc-grabber.service';
import { MetaServiceService } from 'src/app/services/meta-service.service';
import { CardComponent } from 'src/app/components/card/card.component';
import { FormsModule } from '@angular/forms';
import { isPlatformBrowser } from '@angular/common';

@Component({
  standalone: true,
  imports: [CardComponent,FormsModule],
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.sass']
})
export class SearchComponent implements OnInit {

  searchInput: string = "";

  sortingCategory: string = "Added";
  sortingDirection: number = -1;

  tagRegions: FrontTag[] = [{ tagId: "", tagName: "All Regions", selected: true }, { tagId: "Australia", tagName: "Australia", selected: false }, { tagId: "China", tagName: "China", selected: false }, { tagId: "Europe", tagName: "Europe", selected: false }, { tagId: "France", tagName: "France", selected: false }, { tagId: "Germany", tagName: "Germany", selected: false }, { tagId: "Japan", tagName: "Japan", selected: false }, { tagId: "New Zeeland", tagName: "New Zeeland", selected: false }, { tagId: "North Korea", tagName: "North Korea", selected: false }, { tagId: "Russia", tagName: "Russia", selected: false }, { tagId: "South Korea", tagName: "South Korea", selected: false }, { tagId: "USSR", tagName: "USSR", selected: false }, { tagId: "Ukraine", tagName: "Ukraine", selected: false }, { tagId: "United Kingdom", tagName: "United Kingdom", selected: false }, { tagId: "USA", tagName: "USA", selected: false }];
  tagTypes: FrontTag[] = [{ tagId: "", tagName: "All Types", selected: true }, { tagId: "rocket", tagName: "Rocket", selected: false }, { tagId: "launchpad", tagName: "Launchpad", selected: false }, { tagId: "spacecraft", tagName: "Spacecraft", selected: false }, { tagId: "spacestation", tagName: "Space Station", selected: false },{ tagId: "merch", tagName: "Merch", selected: false }, { tagId: "other", tagName: "Other", selected: false }];
  tagScales: FrontTag[] = [{ tagId: "", tagName: "All Scales", selected: true }, { tagId: "35", tagName: "1:35", selected: false }, { tagId: "40", tagName: "1:40", selected: false }, { tagId: "110", tagName: "1:110", selected: false }, { tagId: "220", tagName: "1:220", selected: false }, { tagId: "350", tagName: "1:350", selected: false }];

  mocs: Moc[] = [];

  constructor(@Inject(PLATFORM_ID) private platformId: any,private metaService: MetaServiceService, private mocGrabberService: MocGrabberService, private route: ActivatedRoute, private router: Router) { }

  ngOnInit(): void {
    this.route.queryParams
      .subscribe(params => {
        this.clearTags();
        if (params['q']) {
          this.searchInput = params['q'];
        }else{
          this.searchInput = "";
        }
        if (params['type']) {
          let ft: FrontTag | undefined = this.tagTypes.find(frontTag => frontTag.tagId == params['type']);
          if (ft)
            this.tagTypeChange(ft);
        }
        if (params['region']) {
          let ft: FrontTag | undefined = this.tagRegions.find(frontTag => frontTag.tagId == params['region']);
          if (ft)
            this.tagRegionChange(ft);
        }
        if (params['scale']) {
          let ft: FrontTag | undefined = this.tagScales.find(frontTag => frontTag.tagId == params['scale']);
          if (ft)
            this.tagScaleChange(ft);
        }
        this.getMocs();
        if (isPlatformBrowser(this.platformId))
          window.scroll({top: 0,left: 0,behavior: "instant",});
      });
    this.metaService.setDefaultTags("Search - FlosRocketBricks", "https://flosrocketbricks.com/search/");
  }

  changeSorting(category: string): void {
    this.sortingCategory = category;
    this.getMocs();
  }

  changeSortingDirection(): void {
    this.sortingDirection *= -1;
    this.getMocs();
  }

  getMocs(): void {
    let tempMocs: Moc[] = this.mocGrabberService.getAllMocs();

    if (!this.tagRegions[0].selected) {
      let filteredTags: FrontTag[] = this.tagRegions.filter(tagRegion => tagRegion.selected);
      tempMocs = tempMocs.filter((moc: Moc) => filteredTags.some(tag => moc.region.includes(tag.tagId)));
    }

    if (!this.tagTypes[0].selected) {
      let filteredTags: FrontTag[] = this.tagTypes.filter(tagType => tagType.selected);
      tempMocs = tempMocs.filter((moc: Moc) => filteredTags.some(tag => moc.type == tag.tagId));
    }

    if (!this.tagScales[0].selected) {
      let filteredTags: FrontTag[] = this.tagScales.filter(tagScale => tagScale.selected);
      tempMocs = tempMocs.filter((moc: Moc) => filteredTags.some(tag => moc.scale == tag.tagId));
    }

    if (this.searchInput != "") {
      tempMocs = tempMocs.filter((moc: Moc) =>
        moc.title.toLowerCase().indexOf(this.searchInput.toLowerCase()) >= 0
        || moc.altTitles.some(title => title.toLowerCase().indexOf(this.searchInput.toLowerCase()) >= 0)
      );
    }

    switch (this.sortingCategory) {
      case "Added": tempMocs.sort((a: Moc, b: Moc) => this.sortingDirection * (b.id < a.id ? 1 : -1)); break;
      case "Parts": tempMocs.sort((a: Moc, b: Moc) => this.sortingDirection * (b.parts < a.parts ? 1 : -1)); break;
      case "Title": tempMocs.sort((a: Moc, b: Moc) => this.sortingDirection * (b.title > a.title ? 1 : -1)); break;
      case "Updated": tempMocs.sort((a: Moc, b: Moc) => this.sortingDirection * (b.lastupdate < a.lastupdate ? 1 : -1)); break;
    }

    this.mocs = tempMocs;
  }

  clearTags() {
    this.tagTypeChange(this.tagTypes[0]);
    this.tagRegionChange(this.tagRegions[0]);
    this.tagScaleChange(this.tagScales[0]);
  }

  tagTypeChange(fTag: FrontTag): void {
    if (fTag.tagId === "") { //if "all types" is selected
      this.tagTypes.forEach(tagType => {
        tagType.selected = false;
      });
      fTag.selected = true;
    } else {
      this.tagTypes[0].selected = false;
      fTag.selected = !fTag.selected;

      //check if nothing is now selected
      let noneSelected = true;
      this.tagTypes.forEach(tagType => {
        if (tagType.selected)
          noneSelected = false;
      });
      if (noneSelected)
        this.tagTypes[0].selected = true;
    }
    this.getMocs();
  }

  tagRegionChange(fTag: FrontTag): void {
    if (fTag.tagId === "") {
      this.tagRegions.forEach(tagRegion => {
        tagRegion.selected = false;
      });
      fTag.selected = true;
    } else {
      this.tagRegions[0].selected = false;
      fTag.selected = !fTag.selected;

      //check if nothing is now selected
      let noneSelected = true;
      this.tagRegions.forEach(tagRegion => {
        if (tagRegion.selected)
          noneSelected = false;
      });
      if (noneSelected)
        this.tagRegions[0].selected = true;
    }
    this.getMocs();
  }

  tagScaleChange(fTag: FrontTag): void {
    if (fTag.tagId === "") {
      this.tagScales.forEach(tagScale => {
        tagScale.selected = false;
      });
      fTag.selected = true;
    } else {
      this.tagScales[0].selected = false;
      fTag.selected = !fTag.selected;

      //check if nothing is now selected
      let noneSelected = true;
      this.tagScales.forEach(tagScale => {
        if (tagScale.selected)
          noneSelected = false;
      });
      if (noneSelected)
        this.tagScales[0].selected = true;
    }
    this.getMocs();
  }
}
