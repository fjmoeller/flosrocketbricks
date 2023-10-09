import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Moc, Version } from '../../model/classes';
import { MocGrabberService } from 'src/app/services/moc-grabber.service';
import { MetaServiceService } from 'src/app/services/meta-service.service';

@Component({
  selector: 'app-moc',
  templateUrl: './moc.component.html',
  styleUrls: ['./moc.component.sass']
})
export class MocComponent implements OnInit, OnDestroy {
  moc: Moc;
  relatedMocs: Moc[] = [];
  viewerLink: string = "https://bricksafe.com/files/SkySaac/website/110/usa/stoke/v2.1/v2.1.io"; //default link

  noError: boolean = true;
  showViewer: boolean = false;

  constructor(private metaService: MetaServiceService, private route: ActivatedRoute, private mocGrabberService: MocGrabberService) {
    //default moc
    this.moc = this.mocGrabberService.getEmptyMoc();
  }

  async ngOnInit() {
    this.route.paramMap.subscribe(paramMap => {
      const id = Number(paramMap.get('id')) || 0;
      const foundMoc = this.mocGrabberService.getMoc(id);
      if (foundMoc != undefined && this.moc != null) {
        this.moc = foundMoc;
        this.metaService.setAllTags(this.moc.title + " - FlosRocketBricks", this.moc.mocDescription, this.metaService.getTotalMocLink(this.moc), this.moc.smallCoverImage);
        this.relatedMocs = this.mocGrabberService.getAllMocs().filter(relMoc => this.moc.related.includes(relMoc.id)).slice(0, 5);
        this.noError = true;
      }
      else {
        this.noError = false;
        console.log("Moc with id %s not found", id);
      }
    });
  }

  toggleViewer(url: any): void {

    if (this.viewerLink == url)
      this.showViewer = !this.showViewer;
    else {
      this.viewerLink = url;
      this.showViewer = true;
    }
  }

  downloadXml() {

  }

  downloadCsv() {

  }

  ngOnDestroy(): void {
    this.showViewer = false
  }

  sortedVersions(versions: Version[] | undefined): Version[] {
    if (!versions)
      return [];
    return versions.sort((a, b) => (a.version > b.version) ? -1 : ((b.version > a.version) ? 1 : 0));
  }

  getDifficultyText(val: number): string {
    switch (val) {
      case 1: return "Very Hard";
      case 2: return "Hard";
      case 3: return "Medium";
      case 4: return "Easy";
      case 5: return "Very Easy";
      default: return "Not Tested";
    }
  }

  getStabilityText(val: number): string {
    switch (val) {
      case 1: return "Very Unstable";
      case 2: return "Unstable";
      case 3: return "Medium Stable";
      case 4: return "Stable";
      case 5: return "Very Stable";
      default: return "Not Tested";
    }
  }

}