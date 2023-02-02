import { Injectable } from '@angular/core';
import { Moc } from '../components/classes';
import { HttpClient, HttpParams } from '@angular/common/http';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  baseUrl: string = "https://api.npms.io/v2/invalid-url"

  constructor(private http: HttpClient, private firestore: AngularFirestore) { }
}
