import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { CollectionGrabberService } from 'src/app/services/collection-grabber.service';
import { MocGrabberService } from 'src/app/services/moc-grabber.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.sass']
})
export class HeaderComponent implements OnInit {

  searchInput: string = "";
  tags: string = "";

  constructor(@Inject(DOCUMENT) document: Document, private mocGrabberService: MocGrabberService, private collectionGrabberService: CollectionGrabberService) { }
  ngOnInit(): void {
    
    const randomCol = this.collectionGrabberService.getAllCollections()[Math.floor(Math.random() * this.collectionGrabberService.getAllCollections().length)];
    document.documentElement.style.setProperty("--header-image-collection", "url('" + randomCol.cover + "')");

    const allRockets = this.mocGrabberService.getAllMocs().filter(moc => moc.type=="rocket");
    const randomRock = allRockets[Math.floor(Math.random() * allRockets.length)];
    document.documentElement.style.setProperty("--header-image-rocket", "url('https://flosrocketbricks.com/" + randomRock.smallCoverImage + "')");

    const allLaunchpads = this.mocGrabberService.getAllMocs().filter(moc => moc.type=="launchpad");
    const randomLaunch = allLaunchpads[Math.floor(Math.random() * allLaunchpads.length)];
    document.documentElement.style.setProperty("--header-image-launchpad", "url('https://flosrocketbricks.com/" + randomLaunch.smallCoverImage + "')");

    const allSpacecrafts = this.mocGrabberService.getAllMocs().filter(moc => moc.type=="spacecraft");
    const randomSpacecraft = allSpacecrafts[Math.floor(Math.random() * allSpacecrafts.length)];
    document.documentElement.style.setProperty("--header-image-spacecraft", "url('https://flosrocketbricks.com/" + randomSpacecraft.smallCoverImage + "')");

    const allsSpaceStations = this.mocGrabberService.getAllMocs().filter(moc => moc.type=="spacestation");
    const randomSpaceStation = allsSpaceStations[Math.floor(Math.random() * allsSpaceStations.length)];
    document.documentElement.style.setProperty("--header-image-spacestation", "url('https://flosrocketbricks.com/" + randomSpaceStation.smallCoverImage + "')");

    const allOther = this.mocGrabberService.getAllMocs().filter(moc => moc.type=="other");
    const randomOther = allOther[Math.floor(Math.random() * allOther.length)];
    document.documentElement.style.setProperty("--header-image-other", "url('https://flosrocketbricks.com/" + randomOther.smallCoverImage + "')");

  }

  triggerSearch(e: Event) {
    document.getElementById("searchButton")?.click();
  }

}
