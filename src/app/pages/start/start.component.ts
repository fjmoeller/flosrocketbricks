import { Component, OnInit } from '@angular/core';
import { MocGrabberService } from 'src/app/services/grabber/moc-grabber.service';
import { Collection, Moc } from '../../model/classes';
import { MetaServiceService } from 'src/app/services/meta-service.service';
import { CollectionGrabberService } from 'src/app/services/grabber/collection-grabber.service';
import { ActivatedRoute } from '@angular/router';
import { CardComponent } from 'src/app/components/card/card.component';

@Component({
  standalone: true,
  imports: [CardComponent],
  selector: 'app-start',
  templateUrl: './start.component.html',
  styleUrls: ['./start.component.sass']
})
export class StartComponent implements OnInit {

  newestMocs: Moc[] = [];
  newestUpdates: Moc[] = [];
  collections: Collection[] = [];

  constructor(private metaService: MetaServiceService, private route: ActivatedRoute, private mocGrabberService: MocGrabberService, private collectionGrabberService: CollectionGrabberService) {
  }

  ngOnInit(): void {
    this.metaService.setDefaultTags("Start - FlosRocketBricks", "https://flosrocketbricks.com/");

    this.newestMocs = this.mocGrabberService.getAllMocs().sort((a: Moc, b: Moc) => b.id - a.id).slice(0, 6);
    this.newestUpdates = this.mocGrabberService.getAllMocs().sort((a: Moc, b: Moc) => b.lastupdate > a.lastupdate? 1 : -1).slice(0, 6);
    this.collections = this.collectionGrabberService.getAllCollections().sort((a: Collection, b: Collection) => b.id - a.id).slice(0, 6);
  }

}
