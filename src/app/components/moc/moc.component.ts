import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Moc, Version } from '../classes';
import { MocGrabberService } from 'src/app/services/moc-grabber.service';
import { MetaServiceService } from 'src/app/services/meta-service.service';
import { map, Observable, tap } from 'rxjs';

@Component({
  selector: 'app-moc',
  templateUrl: './moc.component.html',
  styleUrls: ['./moc.component.sass']
})
export class MocComponent implements OnInit {
  moc!: Observable<Moc>;
  relatedMocs!: Observable<Moc[]>;
  viewerLink: string = "https://bricksafe.com/files/SkySaac/website/110/usa/stoke/v2.1/v2.1.io"; //default link

  noError: boolean = true;
  showViewer: boolean = false;
  id: number = 0;

  constructor(private metaService: MetaServiceService, private route: ActivatedRoute, private mocGrabberService: MocGrabberService) { }

  async ngOnInit() {
    this.route.paramMap.subscribe(paramMap => {
      this.id = Number(paramMap.get('id')) || 0;
      this.moc = this.mocGrabberService.getMoc(this.id).pipe(tap(moc => {
        this.metaService.setAllTags(moc.title + " - FlosRocketBricks", moc.mocDescription, "https://flosrocketbricks.com/moc/" + moc.id.toString() + "/" + moc.title.toLowerCase().split(' ').join('-') + "/", moc.smallCoverImage);
        this.relatedMocs = this.mocGrabberService.getAllMocs().pipe(
          map(relMocs => relMocs.filter(relMoc => moc.related.includes(relMoc.id))),
          map((mocs: Moc[]) => mocs.slice(0, 6))
        );
      }));
    });
  }

  toggleViewer(url:any): void {
    this.viewerLink = url;
    if(this.viewerLink == url)
      this.showViewer = !this.showViewer;
    else
      this.showViewer = true;
  }

  sortedVersions(versions: Version[] | undefined): Version[] {
    if (!versions)
      return [];
    return versions.sort((a, b) => (a.version > b.version) ? -1 : ((b.version > a.version) ? 1 : 0));
  }

}


