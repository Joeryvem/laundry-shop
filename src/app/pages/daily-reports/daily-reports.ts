
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface LaundryOrder {
  id: string;
  customerName: string;
  contactNumber?: string;
  weight: number;
  pricePerKilo: number;
  totalFee: number;
  paymentStatus: 'Paid' | 'Unpaid';
  status: string;
  date?: string;
  createdAt?: string;
}

interface ActivityItem {
  label: string;
  count: number;
  height: number;
}

@Component({
  selector: 'app-daily-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './daily-reports.html',
  styleUrl: './daily-reports.scss'
})
export class DailyReports implements OnInit {
  fromDate = this.today();
  toDate = this.today();

  orders: LaundryOrder[] = [];
  filteredOrders: LaundryOrder[] = [];
  appliedFrom = '';
  appliedTo = '';
  errorMessage = '';

  activity: ActivityItem[] = [];
  maxChartValue = 0;
  readonly activityHours = [
    { label: '8 AM', hour: 8 },
    { label: '10 AM', hour: 10 },
    { label: '12 PM', hour: 12 },
    { label: '2 PM', hour: 14 },
    { label: '4 PM', hour: 16 },
    { label: '6 PM', hour: 18 }
  ];

  inventory = [
    { label: 'Pending wash', status: 'Pending', color: 'amber', count: 0 },
    { label: 'Washing', status: 'Washing', color: 'blue', count: 0 },
    { label: 'Drying / Folding', status: 'Drying / Folding', color: 'purple', count: 0 },
    { label: 'Ready for pickup', status: 'Ready for Pickup', color: 'teal', count: 0 }
  ];

  ngOnInit(): void {
    this.loadOrders();
    this.applyDates();
  }

  get collectedIncome(): number {
    return this.filteredOrders
      .filter(order => order.paymentStatus === 'Paid')
      .reduce((sum, order) => sum + this.money(order.totalFee), 0);
  }

  get paidTransactions(): number {
    return this.filteredOrders.filter(
      order => order.paymentStatus === 'Paid'
    ).length;
  }

  get completedTransactions(): number {
    return this.filteredOrders.filter(
      order => order.status === 'Claimed / Complete'
    ).length;
  }

  get processedWeight(): number {
    return this.filteredOrders
      .filter(order => order.status === 'Claimed / Complete')
      .reduce((sum, order) => sum + this.money(order.weight), 0);
  }

  get unpaidOrders(): number {
    return this.filteredOrders.filter(
      order => order.paymentStatus !== 'Paid'
    ).length;
  }

  get outstandingBalance(): number {
    return this.filteredOrders
      .filter(order => order.paymentStatus !== 'Paid')
      .reduce((sum, order) => sum + this.money(order.totalFee), 0);
  }

  get activeOrders(): LaundryOrder[] {
    return this.orders.filter(
      order => order.status !== 'Claimed / Complete'
    );
  }

  get laundryInShop(): number {
    return this.activeOrders.length;
  }

  get totalShopWeight(): number {
    return this.activeOrders.reduce(
      (sum, order) => sum + this.money(order.weight), 0
    );
  }

  applyDates(): void {
    this.errorMessage = '';

    if (!this.fromDate || !this.toDate) {
      this.errorMessage = 'Please select both dates.';
      return;
    }

    if (this.fromDate > this.toDate) {
      this.errorMessage = 'The From date must not be after the To date.';
      return;
    }

    this.appliedFrom = this.fromDate;
    this.appliedTo = this.toDate;

    this.filteredOrders = this.orders.filter(order => {
      const orderDate = this.getOrderDate(order);
      return !!orderDate &&
        orderDate >= this.appliedFrom &&
        orderDate <= this.appliedTo;
    });

    this.updateInventory();
    this.updateActivity();
  }

  refreshReports(): void {
    this.loadOrders();
    this.applyDates();
  }

  private loadOrders(): void {
    try {
      const raw = localStorage.getItem('foldflow_orders');
      const parsed: unknown = raw ? JSON.parse(raw) : [];

      this.orders = Array.isArray(parsed)
        ? parsed.filter(this.isLaundryOrder)
        : [];
    } catch {
      this.orders = [];
      this.errorMessage = 'Unable to read saved orders from this browser.';
    }
  }

  private updateInventory(): void {
    for (const item of this.inventory) {
      item.count = this.activeOrders.filter(
        order => order.status === item.status
      ).length;
    }
  }

  private updateActivity(): void {
    const completed = this.filteredOrders.filter(
      order => order.status === 'Claimed / Complete'
    );

    const counts = this.activityHours.map(({ hour }) =>
      completed.filter(order => {
        const timestamp = this.getOrderTimestamp(order);
        if (!timestamp) return false;

        const date = new Date(timestamp);
        return date.getHours() >= hour &&
          date.getHours() < hour + 2;
      }).length
    );

    const max = Math.max(...counts, 1);
    this.maxChartValue = max;

    this.activity = this.activityHours.map((item, index) => ({
      label: item.label,
      count: counts[index],
      height: counts[index] === 0 ? 0 : Math.max(5, (counts[index] / max) * 100)
    }));
  }

  private getOrderTimestamp(order: LaundryOrder): string {
    if (order.createdAt) return order.createdAt;

    // Legacy orders may only have a date, with no recorded time.
    // Do not invent an order time for the activity chart.
    return '';
  }

  private getOrderDate(order: LaundryOrder): string {
    const rawDate = order.createdAt || order.date;
    if (!rawDate) return '';

    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) {
      return /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
        ? rawDate
        : '';
    }

    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('-');
  }

  private today(): string {
    const date = new Date();
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('-');
  }

  private money(value: unknown): number {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : 0;
  }

  private isLaundryOrder(value: unknown): value is LaundryOrder {
    if (!value || typeof value !== 'object') return false;

    const order = value as Partial<LaundryOrder>;

    return typeof order.id === 'string' &&
      typeof order.customerName === 'string' &&
      typeof order.totalFee === 'number' &&
      typeof order.weight === 'number' &&
      typeof order.status === 'string' &&
      typeof order.paymentStatus === 'string';
  }
}
