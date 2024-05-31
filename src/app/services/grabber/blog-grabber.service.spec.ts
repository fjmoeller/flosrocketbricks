import { TestBed } from '@angular/core/testing';

import { BlogGrabberService } from './blog-grabber.service';

describe('BlogGrabberService', () => {
  let service: BlogGrabberService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BlogGrabberService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
