import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MocGrabberService } from 'src/app/services/moc-grabber.service';
import { Collection, Moc } from '../../model/classes';
import { MetaServiceService } from 'src/app/services/meta-service.service';
import { CollectionGrabberService } from 'src/app/services/collection-grabber.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-start',
  templateUrl: './start.component.html',
  styleUrls: ['./start.component.sass']
})
export class StartComponent implements OnInit {

  newestMocs: Moc[] = [];
  collections: Collection[] = [];

  redirectmoc: Moc;

  showRedirect = false;

  constructor(private metaService: MetaServiceService, private route: ActivatedRoute, private mocGrabberService: MocGrabberService, private collectionGrabberService: CollectionGrabberService) {
    this.redirectmoc = this.mocGrabberService.getEmptyMoc();
  }

  ngOnInit(): void {
    this.metaService.setDefaultTags("Start - FlosRocketBricks", "https://flosrocketbricks.com/");

    this.route.url.subscribe(url => {
      try {
        if (url.length==3 && url[0].toString()=="moc") {
          const redirectMocId = Number(url[url.length - 2].toString());
          const foundMoc = this.mocGrabberService.getMoc(redirectMocId);
          if(foundMoc != undefined && foundMoc != null){
            this.showRedirect = true;
            this.redirectmoc = foundMoc;
          }
        }
      }
      catch (e) { }

    });

    this.newestMocs = this.mocGrabberService.getAllMocs().sort((a: Moc, b: Moc) => b.id - a.id).slice(0, 6);
    this.collections = this.collectionGrabberService.getAllCollections().sort((a: Collection, b: Collection) => b.id - a.id).slice(0, 6);
  }

  clearRedirectMoc() {
    this.redirectmoc = this.mocGrabberService.getEmptyMoc();
    this.showRedirect = false;
  }

}
