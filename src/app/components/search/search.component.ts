import { Component, OnInit } from '@angular/core';
import { Moc } from '../classes';
import { filter, map, Observable } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { MocGrabberService } from 'src/app/services/moc-grabber.service';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.sass']
})
export class SearchComponent implements OnInit {

  searchInput: string = "";

  tagRegion: string = "";
  tagType: string = "";
  tagScale: string = "";
  mocs!: Observable<Moc[]>;

  constructor(private mocGrabberService: MocGrabberService, private route: ActivatedRoute) { }

  ngOnInit(): void {
    this.route.queryParams
      .subscribe(params => {
        if (params['q']) {
          this.searchInput = params['q'];
        }
        if (params['type']) {
          this.tagType = params['type'];
        }
        else if (params['region']) {
          this.tagRegion = params['region'];
        }
        else if (params['scale']) {
          this.tagScale = params['scale'];
        }
        this.getMocs();
      });
  }

  search(): void {
    this.getMocs();
  }

  getMocs(): void {
    let tempMocs: Observable<Moc[]> = this.mocGrabberService.getAllMocs();
    
    if (this.tagRegion != "") {
      tempMocs = tempMocs.pipe(map((mocs:Moc[]) => mocs.filter((moc:Moc) => moc.region==this.tagRegion)));
    }
    if (this.tagType != "") {
      tempMocs = tempMocs.pipe(map((mocs:Moc[]) => mocs.filter((moc:Moc) => moc.type==this.tagType)));
    }
    if (this.tagScale != "") {
      tempMocs = tempMocs.pipe(map((mocs:Moc[]) => mocs.filter((moc:Moc) => moc.scale==this.tagScale)));
    }
    if (this.searchInput != "") {
      tempMocs = tempMocs.pipe(map((mocs:Moc[]) => mocs.filter((moc:Moc) => moc.title.indexOf(this.searchInput)>=0)));
    }
    this.mocs = tempMocs;
  }

  tagTypeChange(val:string):void{
    this.tagType = val;
    this.getMocs();
  }

  tagRegionChange(val:string):void{
    this.tagRegion = val;
    this.getMocs();
  }

  tagScaleChange(val:string):void{
    this.tagScale = val;
    this.getMocs();
  }
}
