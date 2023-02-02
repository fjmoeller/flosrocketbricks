import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DataMockupService } from '../../services/data-mockup.service';
import { Moc } from '../classes';
import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/compat/firestore';
import {connectFirestoreEmulator, getFirestore, provideFirestore} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-moc',
  templateUrl: './moc.component.html',
  styleUrls: ['./moc.component.sass']
})
export class MocComponent implements OnInit {

  private mocDoc!: AngularFirestoreDocument<Moc>;
  moc!: Observable<Moc | null | undefined>;

  noError: boolean = true;
  id: number = 0;

  constructor(private route: ActivatedRoute, private dataMockupService: DataMockupService, private firestore: AngularFirestore) { }

  async ngOnInit() {
    this.route.paramMap.subscribe(paramMap => {

      this.id = Number(paramMap.get('id')) || 0;
      //refresh this moc
      this.getMoc(this.id);

    });
  
  }

  async getMoc(id : number): Promise<void>{
    this.mocDoc = this.firestore.doc<Moc>('mocs/'+id.toString());
    this.moc = this.mocDoc.valueChanges();
    //TODO collections of versions
  }

}
