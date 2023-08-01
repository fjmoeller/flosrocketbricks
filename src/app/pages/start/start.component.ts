import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MocGrabberService } from 'src/app/services/moc-grabber.service';
import { Collection, Moc } from '../../model/classes';
import { MetaServiceService } from 'src/app/services/meta-service.service';
import { CollectionGrabberService } from 'src/app/services/collection-grabber.service';

@Component({
  selector: 'app-start',
  templateUrl: './start.component.html',
  styleUrls: ['./start.component.sass']
})
export class StartComponent implements OnInit {

  newestMocs: Moc[] = [];
  collections: Collection[] = [];

  constructor(private metaService: MetaServiceService, private mocGrabberService: MocGrabberService,private collectionGrabberService: CollectionGrabberService) {
  }

  ngOnInit(): void {
    this.metaService.setDefaultTags("Start - FlosRocketBricks", "https://flosrocketbricks.com");

    this.newestMocs = this.mocGrabberService.getAllMocs().sort((a: Moc, b: Moc) => b.id - a.id).slice(0, 6);
    this.collections = this.collectionGrabberService.getAllCollections().sort((a: Collection, b: Collection) => b.id - a.id).slice(0, 6);
  }

}
