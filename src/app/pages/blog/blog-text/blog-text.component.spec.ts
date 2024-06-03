import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlogTextComponent } from './blog-text.component';

describe('BlogTextComponent', () => {
  let component: BlogTextComponent;
  let fixture: ComponentFixture<BlogTextComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlogTextComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BlogTextComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
