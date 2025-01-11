import { Component, OnInit } from '@angular/core';
import { MetaService } from 'src/app/services/meta.service';
import {RouterLink} from "@angular/router";

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [
    RouterLink
  ],
  templateUrl: './about.component.html',
  styleUrl: './about.component.sass'
})
export class AboutComponent implements OnInit {

  constructor(private metaService: MetaService) { }

  secretContent: string = "Click to reveal";

  ngOnInit(): void {
    this.metaService.setDefaultTags("About - FlosRocketBricks", "https://flosrocketbricks.com/about/");
  }

  doStuff(): void {
    this.secretContent = this.decode("fljsrxcketbricksBOTgmeil.cpm");
  }

  decode(a: string): string {
    return a.replace("p", "o").replace('BOT',"@").replace("me","ma").replace("j", "o").replace("x", "o");
  }
}
