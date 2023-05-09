import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './components/header/header.component';
import { MocComponent } from './pages/moc/moc.component';
import { FileComponent } from './components/file/file.component';
import { SearchComponent } from './pages/search/search.component';
import { CardComponent } from './components/card/card.component';
import { StartComponent } from './pages/start/start.component';
import { AboutComponent } from './pages/about/about.component';
import { FormsModule } from '@angular/forms';
import { FooterComponent } from './components/footer/footer.component';
import { HttpClientModule } from '@angular/common/http';
import { NgbModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { MocGrabberService } from './services/moc-grabber.service';
import { RouterModule } from '@angular/router';
import { MocProxyComponent } from './components/moc-proxy/moc-proxy.component';
import { ViewerComponent } from './components/viewer/viewer.component';
import { BlogComponent } from './components/blog/blog.component';
import { BlogElementComponent } from './components/blog-element/blog-element.component';
import { BlogOverviewComponent } from './pages/blog-overview/blog-overview.component';

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    MocComponent,
    FileComponent,
    SearchComponent,
    CardComponent,
    StartComponent,
    AboutComponent,
    FooterComponent,
    MocProxyComponent,
    ViewerComponent,
    BlogComponent,
    BlogOverviewComponent,
    BlogElementComponent
  ],
  imports: [
    BrowserModule.withServerTransition({ appId: 'serverApp' }),
    AppRoutingModule,
    FormsModule,
    HttpClientModule,
    NgbTooltipModule,
    NgbModule,
    RouterModule
  ],
  providers: [
    MocGrabberService
],
  bootstrap: [AppComponent]
})
export class AppModule {}
