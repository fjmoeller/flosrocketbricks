import {DOCUMENT} from '@angular/common';
import {Component, Inject, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {RouterLink, RouterLinkActive} from '@angular/router';
import {CollectionGrabberService} from 'src/app/services/grabber/collection-grabber.service';
import {MocGrabberService} from 'src/app/services/grabber/moc-grabber.service';

@Component({
  standalone: true,
  imports: [RouterLink, FormsModule, RouterLinkActive],
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

  constructor(@Inject(DOCUMENT) document: Document, private mocGrabberService: MocGrabberService, private collectionGrabberService: CollectionGrabberService) {
  }

  ngOnInit(): void {
    this.allCollections = this.collectionGrabberService.getAllCollections().map(col => col.cover);
    this.allRockets = this.mocGrabberService.getAllMocs().filter(moc => moc.type == "rocket").map(moc => moc.smallCoverImage);
    this.allLaunchpads = this.mocGrabberService.getAllMocs().filter(moc => moc.type == "launchpad").map(moc => moc.smallCoverImage);
    this.allSpacecrafts = this.mocGrabberService.getAllMocs().filter(moc => moc.type == "spacecraft").map(moc => moc.smallCoverImage);
    this.allSpaceStations = this.mocGrabberService.getAllMocs().filter(moc => moc.type == "spacestation").map(moc => moc.smallCoverImage);
  }

  setRandomCollection(): void {
    const randomCol = this.allCollections[Math.floor(Math.random() * this.allCollections.length)];
    document.documentElement.style.setProperty("--header-image-collection", "url('/" + randomCol + "')");
  }

  setRandomRocket(): void {
    const randomRock = this.allRockets[Math.floor(Math.random() * this.allRockets.length)];
    document.documentElement.style.setProperty("--header-image-rocket", "url('/" + randomRock + "')");
  }

  setRandomLaunchpad(): void {
    const randomLaunch = this.allLaunchpads[Math.floor(Math.random() * this.allLaunchpads.length)];
    document.documentElement.style.setProperty("--header-image-launchpad", "url('/" + randomLaunch + "')");
  }

  setRandomSpacecraft(): void {
    const randomSpacecraft = this.allSpacecrafts[Math.floor(Math.random() * this.allSpacecrafts.length)];
    document.documentElement.style.setProperty("--header-image-spacecraft", "url('/" + randomSpacecraft + "')");
  }

  setRandomSpacestation(): void {
    const randomSpaceStation = this.allSpaceStations[Math.floor(Math.random() * this.allSpaceStations.length)];
    document.documentElement.style.setProperty("--header-image-spacestation", "url('/" + randomSpaceStation + "')");
  }

  triggerSearch(): void {
    document.getElementById("searchButton")?.click();
  }

  clearSearch(): void {
    this.searchInput = "";
  }

}
