import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MocGrabberService } from 'src/app/services/moc-grabber.service';

@Component({
  selector: 'app-moc-proxy',
  templateUrl: './moc-proxy.component.html',
  styleUrls: ['./moc-proxy.component.sass']
})
export class MocProxyComponent {

  constructor(private _router: Router, private _route: ActivatedRoute, private mocgrabber: MocGrabberService) {
    mocgrabber.getMoc(_route.snapshot.params['id']).subscribe(moc =>{
      _router.navigate(['/moc/' + _route.snapshot.params['id'] +"/"+ moc.title.toLowerCase().split(' ').join('-')]);
    }
    );
  }

}
