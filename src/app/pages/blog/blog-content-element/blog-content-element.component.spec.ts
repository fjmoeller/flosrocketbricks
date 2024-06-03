import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlogContentElementComponent } from './blog-content-element.component';

describe('BlogContentElementComponent', () => {
  let component: BlogContentElementComponent;
  let fixture: ComponentFixture<BlogContentElementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlogContentElementComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BlogContentElementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
