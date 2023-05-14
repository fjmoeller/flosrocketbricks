import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BlogComponent } from './blog/blog.component';
import { BlogElementComponent } from './blog-element/blog-element.component';
import { CardComponent } from './card/card.component';
import { FileComponent } from './file/file.component';
import { FooterComponent } from './footer/footer.component';
import { HeaderComponent } from './header/header.component';
import { ViewerComponent } from './viewer/viewer.component';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { AppRoutingModule } from '../app-routing.module';



@NgModule({
  declarations: [
    BlogComponent,
    BlogElementComponent,
    CardComponent,
    FileComponent,
    FooterComponent,
    HeaderComponent,
    ViewerComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule,
    NgbModule
  ],
  exports: [
    BlogComponent,
    BlogElementComponent,
    CardComponent,
    FileComponent,
    FooterComponent,
    HeaderComponent,
    ViewerComponent
  ]
})
export class ComponentsModule { }
