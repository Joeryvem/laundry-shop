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
import { Router } from '@angular/router';
import { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseService } from '../../services/supabase.service';

interface DatabaseReservation {
  id: string;
  reference: string | null;
  customer_name: string;
  contact_number: string;
  dropoff_date: string;
  dropoff_time: string;
  status: string;
  created_at: string;
}

interface Reservation {
  id: string;
  reference: string;
  customerName: string;
  contactNumber: string;
  date: string;
  time: string;
  status: 'Confirmed' | 'Pending' | 'Rejected';
}

@Component({
  selector: 'app-reservations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reservations.html',
  styleUrl: './reservations.scss'
})
export class Reservations implements OnInit, OnDestroy {
  reservations: Reservation[] = [];
  showForm = false;
  loading = false;
  saving = false;
  errorMessage = '';
  realtimeErrorMessage = '';
  formErrorMessage = '';

  form = this.emptyReservation();

  private reservationsChannel?: RealtimeChannel;
  private realtimePollingTimer?: ReturnType<typeof setInterval>;
  private readonly isBrowser: boolean;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly router: Router,
    private readonly changeDetector: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  async ngOnInit(): Promise<void> {
    this.subscribeToReservations();
    await this.loadReservations();
  }

  ngOnDestroy(): void {
    if (this.reservationsChannel) {
      void this.supabase.client.removeChannel(this.reservationsChannel);
    }
    this.stopRealtimeFallback();
  }

  private emptyReservation(): Omit<Reservation, 'id' | 'reference'> {
    return {
      customerName: '',
      contactNumber: '',
      date: '',
      time: '',
      status: 'Pending'
    };
  }

  async loadReservations(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';

    try {
      const { data, error } = await this.supabase.client
        .from('reservations')
        .select(
          'id, reference, customer_name, contact_number, dropoff_date, dropoff_time, status, created_at'
        )
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      this.reservations = ((data ?? []) as DatabaseReservation[]).map(row =>
        this.reservationFromRow(row)
      );
    } catch (error) {
      console.error('Failed to load Supabase reservations:', error);
      this.errorMessage = this.errorMessageFor(
        error,
        'Unable to load reservations from Supabase.'
      );
    } finally {
      this.loading = false;
      this.changeDetector.markForCheck();
    }
  }

  private reservationFromRow(row: DatabaseReservation): Reservation {
    return {
      id: row.id,
      reference: row.reference || row.id,
      customerName: row.customer_name,
      contactNumber: row.contact_number,
      date: row.dropoff_date,
      time: this.timeForInput(row.dropoff_time),
      status: this.statusFromDatabase(row.status)
    };
  }

  private statusFromDatabase(status: string): Reservation['status'] {
    if (status === 'confirmed' || status === 'approved') {
      return 'Confirmed';
    }
    if (status === 'rejected') {
      return 'Rejected';
    }
    return 'Pending';
  }

  private timeForInput(value: string): string {
    const twelveHourTime = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(value.trim());
    if (twelveHourTime) {
      let hour = Number(twelveHourTime[1]) % 12;
      if (twelveHourTime[3].toUpperCase() === 'PM') {
        hour += 12;
      }
      return `${String(hour).padStart(2, '0')}:${twelveHourTime[2]}`;
    }

    const twentyFourHourTime = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
    if (twentyFourHourTime) {
      return `${twentyFourHourTime[1].padStart(2, '0')}:${twentyFourHourTime[2]}`;
    }

    return value;
  }

  private subscribeToReservations(): void {
    if (!this.isBrowser) {
      return;
    }

    this.reservationsChannel = this.supabase.client
      .channel('reservations-page-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations'
        },
        () => {
          void this.loadReservations();
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
          console.error(
            'Supabase reservations Realtime subscription failed:',
            error
          );
          this.realtimeErrorMessage = `${this.errorMessageFor(
            error,
            `Live reservation updates failed (${status}).`
          )} Refreshing reservations every 30 seconds instead.`;
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
      void this.loadReservations();
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

  get upcomingCount(): number {
    return this.reservations.filter(
      reservation =>
        reservation.status !== 'Confirmed' ||
        reservation.date >= this.today()
    ).length;
  }

  openAddForm(): void {
    this.form = this.emptyReservation();
    this.formErrorMessage = '';
    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
  }

  async addReservation(): Promise<void> {
    this.formErrorMessage = '';
    if (
      !this.form.customerName.trim() ||
      !this.form.contactNumber.trim() ||
      !this.form.date ||
      !this.form.time
    ) {
      this.formErrorMessage = 'Please complete all fields.';
      return;
    }

    if (this.form.date < this.today()) {
      this.formErrorMessage = 'Drop-off date cannot be in the past.';
      return;
    }

    this.saving = true;
    try {
      const { data, error } = await this.supabase.client
        .from('reservations')
        .insert({
          customer_name: this.form.customerName.trim(),
          contact_number: this.form.contactNumber.trim(),
          dropoff_date: this.form.date,
          dropoff_time: this.form.time
        })
        .select(
          'id, reference, customer_name, contact_number, dropoff_date, dropoff_time, status, created_at'
        )
        .single();

      if (error) {
        throw error;
      }

      this.reservations = [
        this.reservationFromRow(data as DatabaseReservation),
        ...this.reservations
      ];
      this.showForm = false;
      window.alert('Reservation saved successfully.');
    } catch (error) {
      console.error('Failed to save Supabase reservation:', error);
      this.formErrorMessage = `Could not save reservation: ${this.errorMessageFor(
        error,
        'Supabase insert failed.'
      )}`;
    } finally {
      this.saving = false;
      this.changeDetector.markForCheck();
    }
  }

  async reschedule(reservation: Reservation): Promise<void> {
    const newDate = window.prompt(
      'Enter new drop-off date (YYYY-MM-DD):',
      reservation.date
    );
    if (newDate === null) return;

    const newTime = window.prompt(
      'Enter new time (e.g. 09:30):',
      reservation.time
    );
    if (newTime === null) return;

    const date = newDate.trim();
    const time = newTime.trim();
    if (!date || !time || date < this.today()) {
      window.alert('Please enter a valid future date and time.');
      return;
    }

    try {
      const { error } = await this.supabase.client
        .from('reservations')
        .update({ dropoff_date: date, dropoff_time: time })
        .eq('id', reservation.id);

      if (error) {
        throw error;
      }

      await this.loadReservations();
    } catch (error) {
      console.error('Failed to reschedule Supabase reservation:', error);
      this.errorMessage = `Could not reschedule ${reservation.reference}: ${this.errorMessageFor(
        error,
        'Supabase update failed.'
      )}`;
      this.changeDetector.markForCheck();
    }
  }

  async checkIn(reservation: Reservation): Promise<void> {
    const confirmed = window.confirm(
      `Check in ${reservation.customerName}? This will confirm the reservation; ` +
        'create the order after weighing the laundry.'
    );
    if (!confirmed) return;

    try {
      const { error } = await this.supabase.client
        .from('reservations')
        .update({ status: 'confirmed' })
        .eq('id', reservation.id);

      if (error) {
        throw error;
      }

      await this.router.navigate(['/new-order'], {
        queryParams: {
          reservation: reservation.reference,
          customerName: reservation.customerName,
          contactNumber: reservation.contactNumber
        }
      });
    } catch (error) {
      console.error('Failed to confirm Supabase reservation:', error);
      this.errorMessage = `Could not check in ${reservation.reference}: ${this.errorMessageFor(
        error,
        'Supabase update failed.'
      )}`;
      this.changeDetector.markForCheck();
    }
  }

  today(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  formatDate(value: string): string {
    if (!value) return '—';

    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: '2-digit',
      year: 'numeric'
    });
  }

  initials(name: string): string {
    return name.trim().split(/\s+/)
      .slice(0, 2)
      .map(part => part[0] ?? '')
      .join('')
      .toUpperCase();
  }

  trackById(_index: number, reservation: Reservation): string {
    return reservation.id;
  }
}
