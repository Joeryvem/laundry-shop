
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-new-order',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './new-order.html',
  styleUrl: './new-order.scss'
})
export class NewOrder implements OnInit {
  customerName = '';
  contactNumber = '';
  weight = 0;
  pricePerKilo = 60;
  reservationReference = '';
  saving = false;

  message = '';
  messageType: 'success' | 'error' = 'success';

  get totalFee(): number {
    return Math.max(0, Number(this.weight) || 0) *
      Math.max(0, Number(this.pricePerKilo) || 0);
  }

  constructor(
    private readonly supabase: SupabaseService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly changeDetector: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.reservationReference = params.get('reservation') ?? '';
    this.customerName = params.get('customerName') ?? '';
    this.contactNumber = params.get('contactNumber') ?? '';
  }

  async saveOrder(): Promise<void> {
    if (this.saving) return;
    this.message = '';

    const name = this.customerName.trim();
    const phone = this.contactNumber.trim();
    const weight = Number(this.weight);
    const price = Number(this.pricePerKilo);

    if (!name || !phone) {
      this.showMessage(
        'Please enter the customer name and contact number.',
        'error'
      );
      return;
    }

    if (!Number.isFinite(weight) || weight <= 0) {
      this.showMessage(
        'Laundry weight must be greater than zero.',
        'error'
      );
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      this.showMessage(
        'Price per kilo must be greater than zero.',
        'error'
      );
      return;
    }

    this.saving = true;
    try {
      const payload: Record<string, string | number> = {
        customer_name: name,
        contact_number: phone,
        weight_kg: weight
      };

      if (this.reservationReference) {
        const { data: reservation, error: reservationError } =
          await this.supabase.client
            .from('reservations')
            .select('id')
            .eq('reference', this.reservationReference)
            .single();

        if (reservationError) {
          throw reservationError;
        }
        if (!reservation?.id) {
          throw new Error(
            `Reservation ${this.reservationReference} was not found.`
          );
        }

        payload['reservation_id'] = reservation.id;
      }

      const { data: order, error } = await this.supabase.client
        .from('orders')
        .insert(payload)
        .select('order_id')
        .single();

      if (error) {
        throw error;
      }

      this.showMessage(`Order ${order.order_id} saved successfully!`, 'success');
      this.customerName = '';
      this.contactNumber = '';
      this.weight = 0;
      this.pricePerKilo = 60;
      this.reservationReference = '';

      setTimeout(() => {
        void this.router.navigate(['/active-orders']);
      }, 900);
    } catch (error) {
      console.error('Failed to save Supabase order:', error);
      const details =
        error instanceof Error
          ? error.message
          : typeof error === 'object' &&
              error !== null &&
              'message' in error &&
              typeof error.message === 'string'
            ? error.message
            : 'Supabase insert failed.';
      this.showMessage(`Could not save order: ${details}`, 'error');
    } finally {
      this.saving = false;
      this.changeDetector.markForCheck();
    }
  }

  private showMessage(
    text: string,
    type: 'success' | 'error'
  ): void {
    this.message = text;
    this.messageType = type;
  }
}
