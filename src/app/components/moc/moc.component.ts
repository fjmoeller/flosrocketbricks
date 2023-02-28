import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Moc, Version } from '../classes';
import { Observable } from 'rxjs';
import { MocGrabberService } from 'src/app/services/moc-grabber.service';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-moc',
  templateUrl: './moc.component.html',
  styleUrls: ['./moc.component.sass']
})
export class MocComponent implements OnInit {
  moc!: Observable<Moc>;

  noError: boolean = true;
  id: number = 0;

  constructor(private route: ActivatedRoute, private mocGrabberService: MocGrabberService) { }

  async ngOnInit() {
    this.route.paramMap.subscribe(paramMap => {
      this.id = Number(paramMap.get('id')) || 0;
      this.moc = this.mocGrabberService.getMoc(this.id);
    });
  }

  sortedVersions(versions: Version[] | undefined): Version[] {
    if (!versions)
      return [];
    return versions.sort((a,b) => (a.version > b.version) ? -1 : ((b.version > a.version) ? 1 : 0));
  }

}


