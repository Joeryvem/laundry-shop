
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface LaundryOrder {
  id: string;
  customer: string;
  initials: string;
  total: number;
  payment: 'Paid' | 'Unpaid';
  status: string;
}

interface Reservation {
  customer: string;
  time: string;
  bags: number;
  status: 'Confirmed' | 'Pending';
  day: string;
  month: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard {
  orders: LaundryOrder[] = [
    {
      id: 'ORD-1048',
      customer: 'Ava Martinez',
      initials: 'AM',
      total: 420,
      payment: 'Paid',
      status: 'Claimed / Completed'
    },
    {
      id: 'ORD-1045',
      customer: 'Liam Chen',
      initials: 'LC',
      total: 280,
      payment: 'Unpaid',
      status: 'Overdue'
    },
    {
      id: 'ORD-1040',
      customer: 'Maya Santos',
      initials: 'MS',
      total: 345,
      payment: 'Paid',
      status: 'Ready for Pickup'
    },
    {
      id: 'ORD-1039',
      customer: 'Noah Garcia',
      initials: 'NG',
      total: 190,
      payment: 'Unpaid',
      status: 'In Progress'
    }
  ];

  reservations: Reservation[] = [
    {
      customer: 'Sofia Reyes',
      time: '9:30 AM',
      bags: 3,
      status: 'Confirmed',
      day: '14',
      month: 'APR'
    },
    {
      customer: 'Daniel Cruz',
      time: '1:15 PM',
      bags: 2,
      status: 'Pending',
      day: '18',
      month: 'APR'
    }
  ];

  get collectedIncome(): number {
    return this.orders
      .filter(order => order.payment === 'Paid')
      .reduce((total, order) => total + order.total, 0);
  }

  get completedTransactions(): number {
    return this.orders.filter(
      order => order.status === 'Claimed / Completed'
    ).length;
  }

  get activeOrders(): number {
    return this.orders.filter(
      order => order.status !== 'Claimed / Completed'
    ).length;
  }

  get unclaimedLaundry(): number {
    return this.orders.filter(
      order => order.status === 'Ready for Pickup'
    ).length;
  }

  get overdueOrders(): number {
    return this.orders.filter(order => {
      const normalizedStatus = order.status.toLowerCase();
      return (
        normalizedStatus.includes('overdue') ||
        normalizedStatus.includes('late') ||
        normalizedStatus.includes('delayed') ||
        (order.payment === 'Unpaid' &&
          normalizedStatus !== 'claimed / completed' &&
          normalizedStatus !== 'ready for pickup')
      );
    }).length;
  }

  get unpaidOrders(): number {
    return this.orders.filter(
      order => order.payment === 'Unpaid'
    ).length;
  }

  formatPeso(amount: number): string {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      maximumFractionDigits: 2
    }).format(amount);
  }
}
