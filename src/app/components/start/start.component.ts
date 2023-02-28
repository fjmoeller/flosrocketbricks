import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MocGrabberService } from 'src/app/services/moc-grabber.service';
import { Moc } from '../classes';

@Component({
  selector: 'app-start',
  templateUrl: './start.component.html',
  styleUrls: ['./start.component.sass']
})
export class StartComponent implements OnInit {

  newestMocs!: Observable<Moc[]>;

  mocGrabberService: MocGrabberService;

  constructor(mocGrabberService: MocGrabberService) {
    this.mocGrabberService = mocGrabberService;
   }

  ngOnInit(): void {
    this.newestMocs = this.mocGrabberService.getAllMocs().pipe(
      map((mocs:Moc[]) => mocs.sort((a : Moc, b : Moc) => Date.parse(b.dateCreated) - Date.parse(a.dateCreated) )),
      map((mocs:Moc[]) => mocs.slice(0,6))
    );
  }
}
