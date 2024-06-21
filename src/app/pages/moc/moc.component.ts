import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Moc, Version } from '../../model/classes';
import { MocGrabberService } from 'src/app/services/grabber/moc-grabber.service';
import { MetaServiceService } from 'src/app/services/meta-service.service';
import { FileExportService } from 'src/app/services/file/file-export.service';
import { CardComponent } from 'src/app/components/card/card.component';
import { ViewerComponent } from 'src/app/components/viewer/viewer.component';
import { CommonModule, isPlatformBrowser } from '@angular/common';


@Component({
  standalone: true,
  imports: [CardComponent,ViewerComponent,CommonModule],
  selector: 'app-moc',
  templateUrl: './moc.component.html',
  styleUrls: ['./moc.component.sass']
})
export class MocComponent implements OnInit, OnDestroy {
  moc: Moc;
  relatedMocs: Moc[] = [];
  viewerLink: string = "https://bricksafe.com/files/SkySaac/website/110/usa/stoke/v2.1/v2.1.io"; //default link

  showViewer: boolean = false;

  constructor(@Inject(PLATFORM_ID) private platformId: any,private router: Router, private metaService: MetaServiceService, private route: ActivatedRoute, private mocGrabberService: MocGrabberService, private fileExportService: FileExportService) {
    this.moc = this.mocGrabberService.getEmptyMoc();
  }

  async ngOnInit() {
    this.route.paramMap.subscribe(paramMap => {
      this.showViewer = false;
      const id = Number(paramMap.get('id')) || 0;
      const foundMoc = this.mocGrabberService.getMoc(id);
      if (foundMoc !== undefined) {
        this.moc = foundMoc;
        const scaleText: string = (this.moc.scale !== "-" && this.moc.scale !== "") ? (" 1:" + this.moc.scale + " ") : ("");
        this.metaService.setAllTags(this.moc.title + scaleText + " - FlosRocketBricks", this.moc.mocDescription + " " + this.moc.rocketDescription, this.metaService.getTotalMocLink(this.moc), this.moc.smallCoverImage);
        this.relatedMocs = this.mocGrabberService.getAllMocs().filter(relMoc => this.moc.related.includes(relMoc.id)).slice(0, 5);
      }
      else {
        this.router.navigate(['/404/']);
      }
      if (isPlatformBrowser(this.platformId))
        window.scroll({ top: 0, left: 0, behavior: "instant"});
    });
  }

  toggleViewer(url: string): void {
    if (this.viewerLink === url)
      this.showViewer = !this.showViewer;
    else {
      this.viewerLink = url;
      this.showViewer = true;
    }
  }

  async downloadXml(filelink: string, filename: string) {
    const data = await this.fileExportService.getXml(filelink, this.moc.internalColor);
    const blob = new Blob([data], { type: 'application/xml' });
    const a = document.createElement('a');
    a.href = window.URL.createObjectURL(blob);
    a.download = filename.split(".io")[0] + ".xml";
    a.click();
  }

  async downloadCsv(filelink: string, filename: string) {
    const data = await this.fileExportService.getCsv(filelink, this.moc.internalColor);
    const blob = new Blob([data], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = window.URL.createObjectURL(blob);
    a.download = filename.split(".io")[0] + ".csv";
    a.click();
  }

  ngOnDestroy(): void {
    this.showViewer = false;
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