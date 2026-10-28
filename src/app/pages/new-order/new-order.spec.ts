import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { NewOrder } from './new-order';
import { SupabaseService } from '../../services/supabase.service';

describe('NewOrder', () => {
  let component: NewOrder;
  let fixture: ComponentFixture<NewOrder>;
  let insertedPayload: Record<string, string | number> | undefined;
  let orderInsertError: Error | null;
  let router: { navigate: (commands: string[]) => Promise<boolean> };

  beforeEach(async () => {
    insertedPayload = undefined;
    orderInsertError = null;
    router = { navigate: async () => true };

    const client = {
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({
                data: table === 'reservations' ? { id: 'reservation-uuid' } : null,
                error: null
              })
          })
        }),
        insert: (payload: Record<string, string | number>) => {
          insertedPayload = payload;
          return {
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: orderInsertError ? null : { order_id: 'ORD-2049' },
                  error: orderInsertError
                })
            })
          };
        }
      })
    };

    await TestBed.configureTestingModule({
      imports: [NewOrder],
      providers: [
        { provide: SupabaseService, useValue: { client } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (name: string) =>
                  ({
                    reservation: 'REQ-2048',
                    customerName: 'namee',
                    contactNumber: '+1 555 010 2048'
                  })[name] ?? null
              }
            }
          }
        },
        { provide: Router, useValue: router }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NewOrder);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('prefills the customer when receiving a reservation', () => {
    expect(component.reservationReference).toBe('REQ-2048');
    expect(component.customerName).toBe('namee');
    expect(component.contactNumber).toBe('+1 555 010 2048');
  });

  it('creates a weighted order using the reservation UUID and reports its DB ID', async () => {
    component.weight = 2.5;

    await component.saveOrder();

    expect(insertedPayload).toEqual({
      customer_name: 'namee',
      contact_number: '+1 555 010 2048',
      weight_kg: 2.5,
      reservation_id: 'reservation-uuid'
    });
    expect(component.message).toBe('Order ORD-2049 saved successfully!');
    expect(component.messageType).toBe('success');
  });

  it('does not show success when the database insert fails', async () => {
    orderInsertError = new Error('RLS denied the insert');
    component.weight = 2.5;

    await component.saveOrder();

    expect(component.message).toContain('RLS denied the insert');
    expect(component.messageType).toBe('error');
  });
});
