import { Component, OnInit, Input } from '@angular/core';
import { MetaService } from 'src/app/services/meta.service';
import { RouterLink} from '@angular/router';

@Component({
  standalone: true,
  imports: [RouterLink],
  selector: 'app-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.sass']
})
export class CardComponent implements OnInit {

  @Input('pic') coverPicture = "https://pbs.twimg.com/profile_images/1557001528912842757/XujDja68_400x400.jpg"
  @Input('name') mocName = "Test MOC"
  @Input('scale') scale = "110"
  @Input('parts') parts: number = 101
  @Input('type') type: string = "other"
  @Input('id') id: number = 0;
  @Input('followRel') followRel?: boolean = true;

  link: string = "/";

  constructor(private metaService: MetaService) { }

  ngOnInit(): void {
    this.link = this.metaService.getPageMocLink(this.id,this.mocName)+".";
  }

}
