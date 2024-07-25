import { TestBed } from '@angular/core/testing';

import { LdrToThreeService } from './ldr-to-three.service';

describe('LdrToThreeService', () => {
  let service: LdrToThreeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LdrToThreeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
