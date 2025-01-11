import {Component, OnInit} from '@angular/core';
import {MocGrabberService} from 'src/app/services/grabber/moc-grabber.service';
import {Collection, Moc} from '../../model/classes';
import {MetaService} from 'src/app/services/meta.service';
import {CollectionGrabberService} from 'src/app/services/grabber/collection-grabber.service';
import {RouterLink} from '@angular/router';
import {CardComponent} from 'src/app/components/card/card.component';
import {BlogGrabberService} from "../../services/grabber/blog-grabber.service";
import {Blog} from "../../model/blog";

@Component({
  standalone: true,
  imports: [CardComponent, RouterLink],
  selector: 'app-start',
  templateUrl: './start.component.html',
  styleUrls: ['./start.component.sass']
})
export class StartComponent implements OnInit {

  newestMocs: Moc[] = [];
  newestUpdates: Moc[] = [];
  newestBlog!: Blog;
  collections: Collection[] = [];

  constructor(private blogService: BlogGrabberService, private metaService: MetaService, private mocGrabberService: MocGrabberService, private collectionGrabberService: CollectionGrabberService) {
  }

  ngOnInit(): void {
    this.metaService.setDefaultTags("Start - FlosRocketBricks", "https://flosrocketbricks.com/");

    this.newestMocs = this.mocGrabberService.getAllMocs().sort((a: Moc, b: Moc) => b.id - a.id).slice(0, 6);
    this.newestUpdates = this.mocGrabberService.getAllMocs().sort((a: Moc, b: Moc) => b.lastUpdate > a.lastUpdate ? 1 : -1).slice(0, 6);
    this.collections = this.collectionGrabberService.getAllCollections().sort((a: Collection, b: Collection) => b.id - a.id).slice(0, 6);

    this.newestBlog = this.blogService.getNewestBlog();
  }

  getPageBlogLink(blog: Blog): string {
    return this.metaService.getPageBlogLink(blog);
  }

}
