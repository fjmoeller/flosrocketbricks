import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlogImageComponent } from './blog-image.component';

describe('BlogImageComponent', () => {
  let component: BlogImageComponent;
  let fixture: ComponentFixture<BlogImageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlogImageComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BlogImageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
