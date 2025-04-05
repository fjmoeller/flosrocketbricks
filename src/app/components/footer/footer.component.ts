import { Component, OnInit } from '@angular/core';
import {RouterLink, RouterLinkActive} from '@angular/router';

@Component({
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.sass']
})
export class FooterComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
