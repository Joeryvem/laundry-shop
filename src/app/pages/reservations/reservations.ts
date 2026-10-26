
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Reservation {
  id: string;
  customerName: string;
  contactNumber: string;
  date: string;
  time: string;
  bags: number;
  status: 'Confirmed' | 'Pending';
}

@Component({
  selector: 'app-reservations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reservations.html',
  styleUrl: './reservations.scss'
})
export class Reservations implements OnInit {
  reservations: Reservation[] = [];
  showForm = false;

  form: Reservation = this.emptyReservation();

  ngOnInit(): void {
    this.loadReservations();
  }

  private emptyReservation(): Reservation {
    return {
      id: '',
      customerName: '',
      contactNumber: '',
      date: '',
      time: '',
      bags: 1,
      status: 'Pending'
    };
  }

  loadReservations(): void {
    try {
      const data = localStorage.getItem('foldflow_reservations');
      const parsed: unknown = data ? JSON.parse(data) : [];
      this.reservations = Array.isArray(parsed) ? parsed : [];
    } catch {
      this.reservations = [];
    }
  }

  private saveReservations(): void {
    localStorage.setItem(
      'foldflow_reservations',
      JSON.stringify(this.reservations)
    );
  }

  get upcomingCount(): number {
    return this.reservations.filter(
      reservation => reservation.status !== 'Confirmed' ||
        reservation.date >= this.today()
    ).length;
  }

  openAddForm(): void {
    this.form = this.emptyReservation();
    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
  }

  addReservation(): void {
    if (
      !this.form.customerName.trim() ||
      !this.form.contactNumber.trim() ||
      !this.form.date ||
      !this.form.time ||
      this.form.bags < 1
    ) {
      window.alert('Please complete all fields.');
      return;
    }

    if (this.form.date < this.today()) {
      window.alert('Drop-off date cannot be in the past.');
      return;
    }

    const reservation: Reservation = {
      ...this.form,
      id: `RES-${Date.now()}`,
      customerName: this.form.customerName.trim(),
      contactNumber: this.form.contactNumber.trim(),
      status: 'Pending'
    };

    this.reservations = [...this.reservations, reservation];
    this.saveReservations();
    this.showForm = false;
    window.alert('Reservation added successfully.');
  }

  reschedule(reservation: Reservation): void {
    const newDate = window.prompt(
      'Enter new drop-off date (YYYY-MM-DD):',
      reservation.date
    );

    if (newDate === null) return;

    const newTime = window.prompt(
      'Enter new time (e.g. 09:30 AM):',
      reservation.time
    );

    if (newTime === null) return;

    if (!newDate.trim() || !newTime.trim() || newDate < this.today()) {
      window.alert('Please enter a valid future date and time.');
      return;
    }

    reservation.date = newDate.trim();
    reservation.time = newTime.trim();
    this.saveReservations();
  }

  checkIn(reservation: Reservation): void {
    const confirmed = window.confirm(
      `Check in ${reservation.customerName} and create a laundry order?`
    );

    if (!confirmed) return;

    const orders: Record<string, unknown>[] = this.readOrders();
    const orderId = `LDY-${Date.now().toString().slice(-6)}`;

    orders.push({
      id: orderId,
      customerName: reservation.customerName,
      contactNumber: reservation.contactNumber,
      weight: 0,
      pricePerKilo: 60,
      totalFee: 0,
      paymentStatus: 'Unpaid',
      status: 'Pending',
      date: reservation.date,
      reservationId: reservation.id
    });

    try {
      localStorage.setItem('foldflow_orders', JSON.stringify(orders));
      this.reservations = this.reservations.filter(
        item => item.id !== reservation.id
      );
      this.saveReservations();
      window.alert(`Checked in successfully. Order ID: ${orderId}`);
    } catch {
      window.alert('Unable to save the order. Please try again.');
    }
  }

  private readOrders(): Record<string, unknown>[] {
    try {
      const saved = localStorage.getItem('foldflow_orders');
      const parsed: unknown = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
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
