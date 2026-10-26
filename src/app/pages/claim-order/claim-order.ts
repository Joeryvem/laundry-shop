
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

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
  selector: 'app-claim-order',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './claim-order.html',
  styleUrl: './claim-order.scss'
})
export class ClaimOrder {
  searchId = '';
  foundOrder: LaundryOrder | null = null;
  message = '';
  messageType: 'success' | 'error' | '' = '';
  paymentMethod = 'Cash';
  saving = false;

  searchOrder(): void {
    this.message = '';
    this.messageType = '';
    this.foundOrder = null;

    const id = this.searchId.trim().toLowerCase();

    if (!id) {
      this.showMessage('Please enter an order ID.', 'error');
      return;
    }

    const orders = this.readOrders();
    const order = orders.find(
      item => item.id.toLowerCase() === id
    );

    if (!order) {
      this.showMessage('Order not found. Please check the order ID.', 'error');
      return;
    }

    this.foundOrder = order;
  }

  recordPayment(): void {
    if (!this.foundOrder || this.saving) return;

    if (this.foundOrder.status !== 'Ready for Pickup') {
      this.showMessage(
        'Only orders marked Ready for Pickup can be claimed.',
        'error'
      );
      return;
    }

    if (this.foundOrder.paymentStatus === 'Paid') {
      this.showMessage('This order is already paid.', 'success');
      return;
    }

    const confirmed = window.confirm(
      `Record ₱${this.foundOrder.totalFee.toFixed(2)} payment via ${this.paymentMethod}?`
    );

    if (!confirmed) return;

    this.foundOrder.paymentStatus = 'Paid';
    this.persistFoundOrder();
  }

  completeClaim(): void {
    if (!this.foundOrder || this.saving) return;

    if (this.foundOrder.status !== 'Ready for Pickup') {
      this.showMessage(
        'This order is not ready for pickup yet.',
        'error'
      );
      return;
    }

    if (this.foundOrder.paymentStatus !== 'Paid') {
      this.showMessage(
        'Please record payment before completing the claim.',
        'error'
      );
      return;
    }

    const confirmed = window.confirm(
      `Confirm that ${this.foundOrder.customerName} has collected the laundry?`
    );

    if (!confirmed) return;

    this.foundOrder.status = 'Claimed / Complete';
    this.persistFoundOrder();
  }

  private persistFoundOrder(): void {
    if (!this.foundOrder) return;

    this.saving = true;

    try {
      const orders = this.readOrders();
      const index = orders.findIndex(
        item => item.id === this.foundOrder!.id
      );

      if (index === -1) {
        this.foundOrder = null;
        this.showMessage('Order no longer exists. Search again.', 'error');
        return;
      }

      orders[index] = { ...this.foundOrder };

      localStorage.setItem('foldflow_orders', JSON.stringify(orders));

      this.showMessage('Order updated successfully.', 'success');
    } catch {
      this.showMessage('Unable to save changes. Please try again.', 'error');
    } finally {
      this.saving = false;
    }
  }

  private readOrders(): LaundryOrder[] {
    try {
      const saved = localStorage.getItem('foldflow_orders');
      const parsed: unknown = saved ? JSON.parse(saved) : [];

      if (!Array.isArray(parsed)) return [];

      return parsed.filter(
        (item): item is LaundryOrder =>
          !!item &&
          typeof item.id === 'string' &&
          typeof item.customerName === 'string' &&
          typeof item.totalFee === 'number'
      );
    } catch {
      return [];
    }
  }

  private showMessage(
    text: string,
    type: 'success' | 'error'
  ): void {
    this.message = text;
    this.messageType = type;
  }

  clearSearch(): void {
    this.searchId = '';
    this.foundOrder = null;
    this.message = '';
    this.messageType = '';
  }
}
