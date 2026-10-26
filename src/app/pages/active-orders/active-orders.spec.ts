import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActiveOrders } from './active-orders';

describe('ActiveOrders', () => {
  let component: ActiveOrders;
  let fixture: ComponentFixture<ActiveOrders>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActiveOrders],
    }).compileComponents();

    fixture = TestBed.createComponent(ActiveOrders);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
