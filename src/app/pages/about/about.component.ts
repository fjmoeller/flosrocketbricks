import { Component, OnInit } from '@angular/core';
import { MetaServiceService } from 'src/app/services/meta-service.service';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [],
  templateUrl: './about.component.html',
  styleUrl: './about.component.sass'
})
export class AboutComponent implements OnInit {

  constructor(private metaService: MetaServiceService) { }

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