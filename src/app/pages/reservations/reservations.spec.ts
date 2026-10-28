import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Reservations } from './reservations';
import { SupabaseService } from '../../services/supabase.service';

describe('Reservations', () => {
  let component: Reservations;
  let fixture: ComponentFixture<Reservations>;
  let reservationRows: Record<string, unknown>[];
  let insertedPayload: Record<string, unknown> | undefined;
  let queryError: Error | null;
  let router: { navigate: (commands: string[], extras?: unknown) => Promise<boolean> };

  beforeEach(async () => {
    reservationRows = [
      {
        id: 'reservation-uuid',
        reference: 'REQ-2048',
        customer_name: 'namee',
        contact_number: '+1 555 010 2048',
        dropoff_date: '2026-10-30',
        dropoff_time: '9:00 AM',
        status: 'pending',
        created_at: '2026-10-28T08:00:00.000Z'
      }
    ];
    insertedPayload = undefined;
    queryError = null;
    router = { navigate: async () => true };

    const channel = {
      on: () => channel,
      subscribe: (callback?: (status: string) => void) => {
        callback?.('SUBSCRIBED');
        return channel;
      }
    };
    const client = {
      from: (table: string) => ({
        select: () => ({
          order: () =>
            Promise.resolve({
              data: table === 'reservations' ? reservationRows : [],
              error: queryError
            })
        }),
        insert: (payload: Record<string, unknown>) => {
          insertedPayload = payload;
          return {
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: 'new-reservation-uuid',
                    reference: 'REQ-NEW',
                    customer_name: payload['customer_name'],
                    contact_number: payload['contact_number'],
                    dropoff_date: payload['dropoff_date'],
                    dropoff_time: payload['dropoff_time'],
                    status: 'pending',
                    created_at: '2026-10-28T09:00:00.000Z'
                  },
                  error: null
                })
            })
          };
        }
      }),
      channel: () => channel,
      removeChannel: () => Promise.resolve('ok')
    };

    await TestBed.configureTestingModule({
      imports: [Reservations],
      providers: [
        { provide: SupabaseService, useValue: { client } },
        { provide: Router, useValue: router }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Reservations);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('loads Flutter reservations from Supabase', () => {
    expect(component.loading).toBe(false);
    expect(component.reservations[0]).toEqual({
      id: 'reservation-uuid',
      reference: 'REQ-2048',
      customerName: 'namee',
      contactNumber: '+1 555 010 2048',
      date: '2026-10-30',
      time: '09:00',
      status: 'Pending'
    });
    expect(fixture.nativeElement.textContent).toContain('namee');
  });

  it('shows query errors instead of claiming there are no reservations', async () => {
    queryError = new Error('RLS denied the query');

    await component.loadReservations();
    fixture.detectChanges();

    expect(component.errorMessage).toBe('RLS denied the query');
    expect(fixture.nativeElement.textContent).not.toContain('No reservations yet');
  });

  it('inserts a reservation using the existing database fields', async () => {
    component.form.customerName = 'New Customer';
    component.form.contactNumber = '+1 555 010 5555';
    component.form.date = '2026-11-02';
    component.form.time = '10:30';

    const originalAlert = window.alert;
    window.alert = () => undefined;
    try {
      await component.addReservation();
    } finally {
      window.alert = originalAlert;
    }

    expect(insertedPayload).toEqual({
      customer_name: 'New Customer',
      contact_number: '+1 555 010 5555',
      dropoff_date: '2026-11-02',
      dropoff_time: '10:30'
    });
    expect(component.reservations[0].reference).toBe('REQ-NEW');
  });
});
