import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlogElementComponent } from './blog-element.component';

describe('BlogElementComponent', () => {
  let component: BlogElementComponent;
  let fixture: ComponentFixture<BlogElementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BlogElementComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BlogElementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
