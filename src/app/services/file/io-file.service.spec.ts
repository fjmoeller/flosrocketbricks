import { TestBed } from '@angular/core/testing';

import { IoFileService } from './io-file.service';

describe('IoFileService', () => {
  let service: IoFileService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IoFileService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
