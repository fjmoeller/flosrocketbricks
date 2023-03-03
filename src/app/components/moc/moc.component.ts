import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Moc, Version } from '../classes';
import { MocGrabberService } from 'src/app/services/moc-grabber.service';
import { MetaServiceService } from 'src/app/services/meta-service.service';
import { Observable, tap } from 'rxjs';

@Component({
  selector: 'app-moc',
  templateUrl: './moc.component.html',
  styleUrls: ['./moc.component.sass']
})
export class MocComponent implements OnInit {
  moc!: Observable<Moc>;

  noError: boolean = true;
  id: number = 0;

  constructor(private metaService: MetaServiceService, private route: ActivatedRoute, private mocGrabberService: MocGrabberService) { }

  async ngOnInit() {
    this.route.paramMap.subscribe(paramMap => {
      this.id = Number(paramMap.get('id')) || 0;
      this.moc = this.mocGrabberService.getMoc(this.id).pipe(tap(moc => {
        this.mocGrabberService.getMoc(this.id).subscribe(moc => {
          this.metaService.setAllTags(moc.title+" - FlosRocketBricks",moc.description,"https://flosrocketbricks.com/moc/"+moc.id.toString(),moc.pictures[0]);
        });
      }));
    });
  }

  /*
  public ngOnDestroy() {
    this.metaTagService.removeTag('og:image');
    this.metaTagService.removeTag('twitter:card');
    this.metaTagService.removeTag('date');
  }
  */

  sortedVersions(versions: Version[] | undefined): Version[] {
    if (!versions)
      return [];
    return versions.sort((a, b) => (a.version > b.version) ? -1 : ((b.version > a.version) ? 1 : 0));
  }

}


