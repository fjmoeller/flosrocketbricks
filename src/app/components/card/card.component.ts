import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.sass']
})
export class CardComponent implements OnInit {

  @Input('pic') coverPicture = "https://pbs.twimg.com/profile_images/1557001528912842757/XujDja68_400x400.jpg"
  @Input('name') mocName = "Test MOC"
  @Input('scale') scale = "110"
  @Input('parts') parts: number = 101
  @Input('id') id: number = 0;

  link: string = "/";

  constructor() { }

  ngOnInit(): void {
    this.link = "/moc/" + this.id + "/" + this.mocName.toLowerCase().replace("/","-").replace("'","-").replace(" ","-").replace(".","-");
  }

}
