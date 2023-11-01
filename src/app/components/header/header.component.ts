import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { Moc } from 'src/app/model/classes';
import { CollectionGrabberService } from 'src/app/services/grabber/collection-grabber.service';
import { MocGrabberService } from 'src/app/services/grabber/moc-grabber.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.sass']
})
export class HeaderComponent implements OnInit {

  searchInput: string = "";
  tags: string = "";

  allCollections: string[] = [];
  allRockets: string[] = [];
  allLaunchpads: string[] = [];
  allSpacecrafts: string[] = [];
  allSpaceStations: string[] = [];
  allOther: string[] = [];

  constructor(@Inject(DOCUMENT) document: Document, private mocGrabberService: MocGrabberService, private collectionGrabberService: CollectionGrabberService) { }
  ngOnInit(): void {
    this.allCollections = this.collectionGrabberService.getAllCollections().map(col => col.cover);
    this.allRockets = this.mocGrabberService.getAllMocs().filter(moc => moc.type == "rocket").map(moc => moc.smallCoverImage);
    this.allLaunchpads = this.mocGrabberService.getAllMocs().filter(moc => moc.type == "launchpad").map(moc => moc.smallCoverImage);
    this.allSpacecrafts = this.mocGrabberService.getAllMocs().filter(moc => moc.type == "spacecraft").map(moc => moc.smallCoverImage);
    this.allSpaceStations = this.mocGrabberService.getAllMocs().filter(moc => moc.type == "spacestation").map(moc => moc.smallCoverImage);
    this.allOther = this.mocGrabberService.getAllMocs().filter(moc => moc.type == "other").map(moc => moc.smallCoverImage);
  }

  setRandomCollection(): void {
    const randomCol = this.allCollections[Math.floor(Math.random() * this.allCollections.length)];
    document.documentElement.style.setProperty("--header-image-collection", "url('" + randomCol + "')");
  }

  setRandomRocket(): void {
    const randomRock = this.allRockets[Math.floor(Math.random() * this.allRockets.length)];
    document.documentElement.style.setProperty("--header-image-rocket", "url('https://flosrocketbricks.com/" + randomRock + "')");
  }

  setRandomLaunchpad(): void {
    const randomLaunch = this.allLaunchpads[Math.floor(Math.random() * this.allLaunchpads.length)];
    document.documentElement.style.setProperty("--header-image-launchpad", "url('https://flosrocketbricks.com/" + randomLaunch + "')");
  }

  setRandomSpacecraft(): void {
    const randomSpacecraft = this.allSpacecrafts[Math.floor(Math.random() * this.allSpacecrafts.length)];
    document.documentElement.style.setProperty("--header-image-spacecraft", "url('https://flosrocketbricks.com/" + randomSpacecraft + "')");
  }

  setRandomSpacestation(): void {
    const randomSpaceStation = this.allSpaceStations[Math.floor(Math.random() * this.allSpaceStations.length)];
    document.documentElement.style.setProperty("--header-image-spacestation", "url('https://flosrocketbricks.com/" + randomSpaceStation + "')");
  }

  setRandomOther(): void {
    const randomOther = this.allOther[Math.floor(Math.random() * this.allOther.length)];
    document.documentElement.style.setProperty("--header-image-other", "url('https://flosrocketbricks.com/" + randomOther + "')");
  }

  triggerSearch(e: Event) {
    document.getElementById("searchButton")?.click();
  }

}
