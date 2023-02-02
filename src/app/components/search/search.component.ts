import { Component, OnInit } from '@angular/core';
import {Moc } from '../classes';
import {DataMockupService} from '../../services/data-mockup.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.sass']
})
export class SearchComponent implements OnInit {

  searchInput : string = "";
  mocs!: Observable<Moc[]>;
  data : DataMockupService;

  constructor(private dataMockupService: DataMockupService, private firestore: AngularFirestore) {this.data = new DataMockupService(); }

  ngOnInit(): void {
    //this.mocs = this.dataMockupService.getMocs("",[]);
    this.getMocs(this.searchInput,[]);
    
  }

  getMocs(searchPath: string, filterTags: string[]): void{

    if (!searchPath) {
      searchPath = "";
    }

    const mocRef = this.firestore.collection<Moc>('mocs', ref => {
      return ref.where('title', '>=', searchPath).where('title', '<=', searchPath + '~');
    });

    this.mocs = mocRef.valueChanges();
  }

}
