import {Component, Inject, OnDestroy, OnInit, PLATFORM_ID} from '@angular/core';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {Moc, Version} from '../../model/classes';
import {MocGrabberService} from 'src/app/services/grabber/moc-grabber.service';
import {MetaService} from 'src/app/services/meta.service';
import {FileExportService} from 'src/app/services/file/file-export.service';
import {CardComponent} from 'src/app/components/card/card.component';
import {ViewerComponent} from 'src/app/components/viewer/viewer.component';
import {CommonModule, DOCUMENT, isPlatformBrowser} from '@angular/common';
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {ExportSettingsComponent} from "../../components/export-settings/export-settings.component";
import {CommentSectionComponent} from "../../components/comment-section/comment-section.component";


@Component({
  standalone: true,
  imports: [CardComponent, ViewerComponent, CommonModule, RouterLink, ReactiveFormsModule, FormsModule, ExportSettingsComponent, CommentSectionComponent],
  selector: 'app-moc',
  templateUrl: './moc.component.html',
  styleUrls: ['./moc.component.sass']
})
export class MocComponent implements OnInit, OnDestroy {
  moc: Moc;
  relatedMocs: Moc[] = [];
  viewerLink: string = "https://bricksafe.com/files/SkySaac/website/110/usa/stoke/v2.1/v2.1.io"; //default link
  viewerVersion: string = "V1";

  showViewer: boolean = false;
  slideIndex: number = 0;

  constructor(@Inject(DOCUMENT) private document: Document, @Inject(PLATFORM_ID) private platformId: any,
              private router: Router, private metaService: MetaService, private route: ActivatedRoute,
              private mocGrabberService: MocGrabberService, private fileExportService: FileExportService) {
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
        this.metaService.setAllTags(this.moc.title + scaleText + " - FlosRocketBricks", this.moc.mocDescription + " " + this.moc.rocketDescription, this.metaService.getTotalMocLink(this.moc), this.moc.pictures[0]);
        this.relatedMocs = this.mocGrabberService.getAllMocs().filter(relMoc => this.moc.related.includes(relMoc.id)).slice(0, 5);
      } else {
        this.router.navigate(['/404/']);
      }
      if (isPlatformBrowser(this.platformId))
        window.scroll({top: 0, left: 0, behavior: "instant"});

    });
  }

  changeSlide(n: number): void {
    this.slideIndex = ((this.slideIndex + n) + this.moc.pictures.length) % this.moc.pictures.length;
  }

  toggleViewer(url: string, version?: string): void {
    if (this.viewerLink === url)
      this.showViewer = !this.showViewer;
    else {
      this.viewerLink = url;
      if(version)
        this.viewerVersion = version;
      else
        this.viewerVersion = "V1";
      this.showViewer = true;
    }
    if (this.showViewer)
      this.document.getElementById("viewer")?.scrollIntoView(true);
  }

  async downloadXml(fileLink: string, filename: string) {
    const data = await this.fileExportService.getXml(fileLink, this.moc.internalColor);
    const blob = new Blob([data], {type: 'application/xml'});
    const a = document.createElement('a');
    a.href = window.URL.createObjectURL(blob);
    a.download = filename.split(".io")[0] + ".xml";
    a.click();
    window.URL.revokeObjectURL(a.href);
  }

  async downloadCsv(fileLink: string, filename: string) {
    const data = await this.fileExportService.getCsv(fileLink, this.moc.internalColor);
    const blob = new Blob([data], {type: 'text/csv'});
    const a = document.createElement('a');
    a.href = window.URL.createObjectURL(blob);
    a.download = filename.split(".io")[0] + ".csv";
    a.click();
    window.URL.revokeObjectURL(a.href);
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
      case 1:
        return "Very Hard";
      case 2:
        return "Hard";
      case 3:
        return "Medium";
      case 4:
        return "Easy";
      case 5:
        return "Very Easy";
      default:
        return "Not Tested";
    }
  }

  getStabilityText(val: number): string {
    switch (val) {
      case 1:
        return "Very Unstable";
      case 2:
        return "Unstable";
      case 3:
        return "Medium Stable";
      case 4:
        return "Stable";
      case 5:
        return "Very Stable";
      default:
        return "Not Tested";
    }
  }

}
