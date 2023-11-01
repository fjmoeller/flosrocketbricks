import { TestBed } from '@angular/core/testing';

import { OrbmechService } from './orbmech.service';

describe('OrbmechService', () => {
  let service: OrbmechService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OrbmechService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
