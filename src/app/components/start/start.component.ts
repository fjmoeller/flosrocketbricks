import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MocGrabberService } from 'src/app/services/moc-grabber.service';
import { Moc } from '../classes';
import { MetaServiceService } from 'src/app/services/meta-service.service';

@Component({
  selector: 'app-start',
  templateUrl: './start.component.html',
  styleUrls: ['./start.component.sass']
})
export class StartComponent implements OnInit {

  newestMocs!: Observable<Moc[]>;

  constructor(private metaService: MetaServiceService, private mocGrabberService: MocGrabberService) {
  }

  ngOnInit(): void {
    this.metaService.setDefaultTags("Start - FlosRocketBricks","https://flosrocketbricks.com");

    this.newestMocs = this.mocGrabberService.getAllMocs().pipe(
      map((mocs: Moc[]) => mocs.sort((a: Moc, b: Moc) => Date.parse(b.dateCreated) - Date.parse(a.dateCreated))),
      map((mocs: Moc[]) => mocs.slice(0, 6))
    );
  }

}
