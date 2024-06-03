import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlogLinkComponent } from './blog-link.component';

describe('BlogLinkComponent', () => {
  let component: BlogLinkComponent;
  let fixture: ComponentFixture<BlogLinkComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlogLinkComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BlogLinkComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
