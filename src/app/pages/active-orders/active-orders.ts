
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
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
  selector: 'app-active-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './active-orders.html',
  styleUrl: './active-orders.scss'
})
export class ActiveOrders implements OnInit {
  orders: LaundryOrder[] = [];
  searchText = '';
  selectedStatus = 'All statuses';

  readonly statuses = [
    'Pending',
    'Washing',
    'Drying / Folding',
    'Ready for Pickup',
    'Claimed / Complete'
  ];

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    try {
      const saved = localStorage.getItem('foldflow_orders');
      const parsed: unknown = saved ? JSON.parse(saved) : [];

      this.orders = Array.isArray(parsed) ? parsed : [];
    } catch {
      this.orders = [];
    }
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

  updateStatus(order: LaundryOrder, newStatus: string): void {
    order.status = newStatus;
    this.saveOrders();
  }

  togglePayment(order: LaundryOrder): void {
    order.paymentStatus =
      order.paymentStatus === 'Paid' ? 'Unpaid' : 'Paid';

    this.saveOrders();
  }

  private saveOrders(): void {
    try {
      localStorage.setItem(
        'foldflow_orders',
        JSON.stringify(this.orders)
      );
    } catch {
      window.alert('Unable to save changes to browser storage.');
    }
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
