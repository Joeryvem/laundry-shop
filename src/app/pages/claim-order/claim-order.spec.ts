import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClaimOrder } from './claim-order';

describe('ClaimOrder', () => {
  let component: ClaimOrder;
  let fixture: ComponentFixture<ClaimOrder>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClaimOrder],
    }).compileComponents();

    fixture = TestBed.createComponent(ClaimOrder);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
