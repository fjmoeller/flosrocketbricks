import { Component, OnInit } from '@angular/core';
import { DataMockupService } from 'src/app/services/data-mockup.service';
import {Moc } from '../classes';

@Component({
  selector: 'app-start',
  templateUrl: './start.component.html',
  styleUrls: ['./start.component.sass']
})
export class StartComponent implements OnInit {


  dataService : DataMockupService;
  newestMocs : Moc[] = [];

  constructor(private dataMockupService: DataMockupService) {this.dataService = new DataMockupService(); }

  ngOnInit(): void {
    this.newestMocs = this.dataMockupService.getMocs("",[]);
  }

}
