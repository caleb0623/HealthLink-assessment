import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { HealthLinkApiService, type Consultation, type Doctor, type PatientProfile } from './services/healthlink-api.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  doctors: Doctor[] = [];
  consultations: Consultation[] = [];
  selectedDoctor: Doctor | null = null;
  patient: PatientProfile | null = null;
  username = '';
  password = '';
  isAuthenticated = false;
  loggingIn = false;
  loginError = '';
  upcomingModalOpen = false;
  doctorDirectoryOpen = false;
  consultationType: 'Chat' | 'Video' = 'Video';
  preferredTime = '';
  reason = '';
  loading = true;
  submitting = false;
  cancellingConsultationId: string | null = null;
  errorMessage = '';
  successMessage = '';

  constructor(private readonly api: HealthLinkApiService) {}

  ngOnInit(): void {
    if (!this.api.hasSession()) {
      this.loading = false;
      return;
    }

    this.api.getCurrentPatient().subscribe({
      next: (patient) => {
        this.patient = patient;
        this.isAuthenticated = true;
        this.refreshDashboard();
      },
      error: () => {
        this.api.clearSession();
        this.loading = false;
      }
    });
  }

  get upcomingConsultations(): Consultation[] {
    return this.consultations
      .filter((item) => item.status === 'Scheduled' && new Date(item.preferredTime).getTime() >= Date.now())
      .sort((first, second) => new Date(first.preferredTime).getTime() - new Date(second.preferredTime).getTime());
  }

  get featuredDoctors(): Doctor[] {
    const specialties = new Set<string>();
    return this.doctors.filter((doctor) => {
      if (specialties.has(doctor.specialty)) return false;
      specialties.add(doctor.specialty);
      return true;
    });
  }

  get scheduledCount(): number {
    return this.upcomingConsultations.length;
  }

  get nextConsultation(): Consultation | undefined {
    return this.upcomingConsultations[0];
  }

  get minimumTime(): string {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  }

  login(): void {
    this.loggingIn = true;
    this.loginError = '';
    this.api.login(this.username.trim(), this.password).subscribe({
      next: ({ patient }) => {
        this.patient = patient;
        this.isAuthenticated = true;
        this.loggingIn = false;
        this.password = '';
        this.refreshDashboard();
      },
      error: (error: { error?: { message?: string } }) => {
        this.loggingIn = false;
        this.loginError = error.error?.message ?? 'We could not sign you in. Please try again.';
      }
    });
  }

  logout(): void {
    this.api.logout().subscribe({
      complete: () => this.finishLogout(),
      error: () => this.finishLogout()
    });
  }

  refreshDashboard(): void {
    this.loading = true;
    forkJoin({
      doctors: this.api.getDoctors(),
      consultations: this.api.getConsultations()
    }).subscribe({
      next: ({ doctors, consultations }) => {
        this.doctors = doctors;
        this.consultations = consultations;
        this.loading = false;
      },
      error: () => this.failToLoad()
    });
  }

  openUpcomingAppointments(): void {
    this.upcomingModalOpen = true;
  }

  openDoctorDirectory(): void {
    this.doctorDirectoryOpen = true;
  }

  openBooking(doctor: Doctor): void {
    this.doctorDirectoryOpen = false;
    this.selectedDoctor = doctor;
    this.consultationType = 'Video';
    this.preferredTime = '';
    this.reason = '';
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeBooking(): void {
    this.selectedDoctor = null;
    this.errorMessage = '';
  }

  submitBooking(): void {
    if (!this.selectedDoctor || !this.preferredTime || !this.reason.trim()) {
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    this.api.bookConsultation({
      doctorId: this.selectedDoctor.id,
      consultationType: this.consultationType,
      preferredTime: new Date(this.preferredTime).toISOString(),
      reason: this.reason.trim()
    }).subscribe({
      next: () => {
        this.submitting = false;
        this.selectedDoctor = null;
        this.successMessage = 'Your consultation is booked. We look forward to seeing you.';
        this.refreshDashboard();
      },
      error: (error: { error?: { message?: string } }) => {
        this.submitting = false;
        this.errorMessage = error.error?.message ?? 'We could not complete your booking. Please try again.';
      }
    });
  }

  cancelConsultation(consultation: Consultation): void {
    this.cancellingConsultationId = consultation.id;
    this.errorMessage = '';
    this.api.cancelConsultation(consultation.id).subscribe({
      next: () => {
        this.cancellingConsultationId = null;
        this.successMessage = 'Your consultation has been cancelled.';
        this.refreshDashboard();
      },
      error: (error: { error?: { message?: string } }) => {
        this.cancellingConsultationId = null;
        this.errorMessage = error.error?.message ?? 'We could not cancel this consultation. Please try again.';
      }
    });
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    }).format(new Date(value));
  }

  doctorInitials(name: string): string {
    return name.replace('Dr. ', '').split(' ').map((part) => part[0]).join('');
  }

  doctorColor(doctorId: number): string {
    if (doctorId <= 2) return 'mint';
    if (doctorId <= 4) return 'blue';
    if (doctorId <= 6) return 'peach';
    return 'lavender';
  }

  private finishLogout(): void {
    this.isAuthenticated = false;
    this.patient = null;
    this.doctors = [];
    this.consultations = [];
    this.username = '';
    this.password = '';
  }

  private failToLoad(): void {
    this.loading = false;
    this.errorMessage = 'We could not connect to your care team. Please check that the API is running and try again.';
  }
}