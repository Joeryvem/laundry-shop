
import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseService } from '../../services/supabase.service';

interface DatabaseOrder {
  order_id: string;
  customer_name: string;
  contact_number: string;
  weight_kg: number | string;
  status: string;
  received_at: string;
  updated_at: string;
  is_demo: boolean;
}

interface LaundryOrder {
  id: string;
  customerName: string;
  contactNumber: string;
  weight: number;
  totalFee: number | null;
  paymentStatus: 'Paid' | 'Unpaid';
  status: string;
  date: string;
}

@Component({
  selector: 'app-active-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './active-orders.html',
  styleUrl: './active-orders.scss'
})
export class ActiveOrders implements OnInit, OnDestroy {
  orders: LaundryOrder[] = [];
  searchText = '';
  selectedStatus = 'All statuses';
  loading = false;
  errorMessage = '';
  realtimeErrorMessage = '';

  private ordersChannel?: RealtimeChannel;
  private realtimePollingTimer?: ReturnType<typeof setInterval>;
  private readonly isBrowser: boolean;

  readonly statuses = [
    'Pending',
    'Washing',
    'Drying / Folding',
    'Ready for Pickup',
    'Claimed / Complete'
  ];

  private readonly statusToDatabase: Record<string, string> = {
    'Pending': 'received',
    'Washing': 'washing',
    'Drying / Folding': 'drying',
    'Ready for Pickup': 'ready_for_pickup',
    'Claimed / Complete': 'claimed'
  };

  constructor(
    private readonly supabase: SupabaseService,
    private readonly changeDetector: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  async ngOnInit(): Promise<void> {
    this.subscribeToOrders();
    await this.loadOrders();
  }

  ngOnDestroy(): void {
    if (this.ordersChannel) {
      void this.supabase.client.removeChannel(this.ordersChannel);
    }
    this.stopRealtimeFallback();
  }

  async loadOrders(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';

    try {
      const { data, error } = await this.supabase.client
        .from('orders')
        .select(
          'order_id, customer_name, contact_number, weight_kg, status, received_at, updated_at, is_demo'
        )
        .order('received_at', { ascending: false });

      if (error) {
        throw error;
      }

      this.orders = ((data ?? []) as DatabaseOrder[]).map(order => ({
        id: order.order_id,
        customerName: order.customer_name,
        contactNumber: order.contact_number,
        weight: Number(order.weight_kg),
        totalFee: null,
        paymentStatus: 'Unpaid',
        status: this.statusFromDatabase(order.status),
        date: order.received_at
      }));
    } catch (error) {
      console.error('Failed to load Supabase orders:', error);
      this.errorMessage = this.errorMessageFor(
        error,
        'Unable to load orders from Supabase.'
      );
    } finally {
      this.loading = false;
      this.changeDetector.markForCheck();
    }
  }

  private subscribeToOrders(): void {
    this.ordersChannel = this.supabase.client
      .channel('active-orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        () => {
          void this.loadOrders();
        }
      )
      .subscribe((status, error) => {
        if (status === 'SUBSCRIBED') {
          this.realtimeErrorMessage = '';
          this.stopRealtimeFallback();
          this.changeDetector.markForCheck();
          return;
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Supabase orders Realtime subscription failed:', error);
          this.realtimeErrorMessage = `${this.errorMessageFor(
            error,
            `Live order updates failed (${status}).`
          )} Refreshing orders every 30 seconds instead.`;
          this.startRealtimeFallback();
          this.changeDetector.markForCheck();
        }
      });
  }

  private startRealtimeFallback(): void {
    if (!this.isBrowser || this.realtimePollingTimer !== undefined) {
      return;
    }

    this.realtimePollingTimer = setInterval(() => {
      void this.loadOrders();
    }, 30_000);
  }

  private stopRealtimeFallback(): void {
    if (this.realtimePollingTimer !== undefined) {
      clearInterval(this.realtimePollingTimer);
      this.realtimePollingTimer = undefined;
    }
  }

  private errorMessageFor(error: unknown, fallback: string): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof error.message === 'string'
    ) {
      return error.message;
    }
    return fallback;
  }

  get filteredOrders(): LaundryOrder[] {
    const query = this.searchText.trim().toLowerCase();

    return this.orders.filter(order => {
      const matchesSearch =
        !query ||
        order.id.toLowerCase().includes(query) ||
        order.customerName.toLowerCase().includes(query) ||
        order.contactNumber.toLowerCase().includes(query);

      const matchesStatus =
        this.selectedStatus === 'All statuses' ||
        order.status === this.selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }

  async updateStatus(
    order: LaundryOrder,
    newStatus: string
  ): Promise<void> {
    const databaseStatus = this.statusToDatabase[newStatus];

    if (!databaseStatus) {
      return;
    }

    const previousStatus = order.status;
    order.status = newStatus;
    this.errorMessage = '';

    try {
      const { error } = await this.supabase.client
        .from('orders')
        .update({
          status: databaseStatus,
          updated_at: new Date().toISOString()
        })
        .eq('order_id', order.id);

      if (error) {
        throw error;
      }
    } catch (error) {
      order.status = previousStatus;
      const updateError = `Could not update ${order.id}: ${this.errorMessageFor(
        error,
        'Supabase update failed.'
      )}`;
      await this.loadOrders();
      this.errorMessage = updateError;
      this.changeDetector.markForCheck();
    }
  }

  togglePayment(order: LaundryOrder): void {
    this.errorMessage =
      'Payment updates are not connected yet. We need to use the payments table.';
  }

  private statusFromDatabase(status: string): string {
    const mapping: Record<string, string> = {
      received: 'Pending',
      washing: 'Washing',
      drying: 'Drying / Folding',
      ready_for_pickup: 'Ready for Pickup',
      claimed: 'Claimed / Complete'
    };

    return mapping[status] ?? status;
  }

  formatDate(dateValue: string): string {
    if (!dateValue) return '—';

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return '—';

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric'
    });
  }

  getInitials(name: string): string {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase();
  }

  trackByOrderId(_index: number, order: LaundryOrder): string {
    return order.id;
  }
}
