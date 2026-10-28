import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActiveOrders } from './active-orders';
import { SupabaseService } from '../../services/supabase.service';

describe('ActiveOrders', () => {
  let component: ActiveOrders;
  let fixture: ComponentFixture<ActiveOrders>;
  let queryResult: {
    data: Record<string, unknown>[] | null;
    error: Error | null;
  };

  beforeEach(async () => {
    queryResult = {
      data: [
        {
          order_id: 'ORD-2048',
          customer_name: 'Test Customer',
          contact_number: '+1 555 010 2048',
          weight_kg: '3.5',
          status: 'received',
          received_at: '2026-10-28T08:00:00.000Z',
          updated_at: '2026-10-28T08:00:00.000Z',
          is_demo: false
        }
      ],
      error: null
    };

    const channel = {
      on: () => channel,
      subscribe: (callback?: (status: string) => void) => {
        callback?.('SUBSCRIBED');
        return channel;
      }
    };
    const client = {
      from: () => ({
        select: () => ({
          order: () => Promise.resolve(queryResult)
        })
      }),
      channel: () => channel,
      removeChannel: () => Promise.resolve('ok')
    };

    await TestBed.configureTestingModule({
      imports: [ActiveOrders],
      providers: [
        { provide: SupabaseService, useValue: { client } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ActiveOrders);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('loads orders and maps database fields for the page', () => {
    expect(component).toBeTruthy();
    expect(component.loading).toBe(false);
    expect(component.orders).toEqual([
      {
        id: 'ORD-2048',
        customerName: 'Test Customer',
        contactNumber: '+1 555 010 2048',
        weight: 3.5,
        totalFee: null,
        paymentStatus: 'Unpaid',
        status: 'Pending',
        date: '2026-10-28T08:00:00.000Z'
      }
    ]);
    expect(fixture.nativeElement.textContent).toContain('ORD-2048');
  });

  it('keeps search and status filtering working', () => {
    component.searchText = 'test customer';
    expect(component.filteredOrders).toHaveLength(1);

    component.selectedStatus = 'Washing';
    expect(component.filteredOrders).toHaveLength(0);
  });

  it('shows query errors instead of an empty-list message', async () => {
    queryResult = { data: null, error: new Error('RLS denied the query') };

    await component.loadOrders();
    fixture.detectChanges();

    expect(component.errorMessage).toBe('RLS denied the query');
    expect(fixture.nativeElement.textContent).not.toContain('No orders yet');
  });
});
