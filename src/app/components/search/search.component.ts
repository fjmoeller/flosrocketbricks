import { Component, OnInit } from '@angular/core';
import {Moc } from '../classes';
import {DataMockupService} from '../../services/data-mockup.service';


@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.sass']
})
export class SearchComponent implements OnInit {

  searchInput : string = "";
  mocs : Moc[] = [];
  data : DataMockupService;

  constructor(private dataMockupService: DataMockupService) {this.data = new DataMockupService(); }

  ngOnInit(): void {
    this.mocs = this.dataMockupService.getMocs("",[]);
  }

}
