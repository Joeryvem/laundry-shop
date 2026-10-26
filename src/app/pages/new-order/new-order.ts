
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface LaundryOrder {
  id: string;
  customerName: string;
  contactNumber: string;
  weight: number;
  pricePerKilo: number;
  totalFee: number;
  paymentStatus: 'Paid' | 'Unpaid';
  status: string;
  date: string;
}

@Component({
  selector: 'app-new-order',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './new-order.html',
  styleUrl: './new-order.scss'
})
export class NewOrder {
  customerName = '';
  contactNumber = '';
  weight = 0;
  pricePerKilo = 60;

  message = '';
  messageType: 'success' | 'error' = 'success';

  get totalFee(): number {
    return Math.max(0, Number(this.weight) || 0) *
      Math.max(0, Number(this.pricePerKilo) || 0);
  }

  private getOrders(): LaundryOrder[] {
    try {
      return JSON.parse(
        localStorage.getItem('foldflow_orders') || '[]'
      ) as LaundryOrder[];
    } catch {
      return [];
    }
  }

  get nextOrderId(): string {
    const orders = this.getOrders();

    const highest = orders.reduce((max, order) => {
      const number = Number(order.id.replace('LDY-', ''));
      return Number.isFinite(number) ? Math.max(max, number) : max;
    }, 1048);

    return `LDY-${String(highest + 1).padStart(4, '0')}`;
  }

  constructor(private router: Router) {}

  saveOrder(): void {
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

    const orders = this.getOrders();

    const order: LaundryOrder = {
      id: this.nextOrderId,
      customerName: name,
      contactNumber: phone,
      weight,
      pricePerKilo: price,
      totalFee: weight * price,
      paymentStatus: 'Unpaid',
      status: 'Pending',
      date: new Date().toISOString()
    };

    orders.push(order);

    try {
      localStorage.setItem(
        'foldflow_orders',
        JSON.stringify(orders)
      );
    } catch {
      this.showMessage(
        'Unable to save. Check your browser storage.',
        'error'
      );
      return;
    }

    this.showMessage(
      `Order ${order.id} saved successfully!`,
      'success'
    );

    this.customerName = '';
    this.contactNumber = '';
    this.weight = 0;
    this.pricePerKilo = 60;

    setTimeout(() => {
      void this.router.navigate(['/active-orders']);
    }, 900);
  }

  private showMessage(
    text: string,
    type: 'success' | 'error'
  ): void {
    this.message = text;
    this.messageType = type;
  }
}
