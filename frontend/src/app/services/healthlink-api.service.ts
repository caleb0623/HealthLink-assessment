import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, tap } from 'rxjs';

export interface Doctor {
  id: number;
  name: string;
  specialty: string;
  availability: string;
  initials: string;
  color: string;
}

export interface Consultation {
  id: string;
  doctorId: number;
  doctorName: string;
  consultationType: 'Chat' | 'Video';
  preferredTime: string;
  reason: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
}

export interface NewConsultation {
  doctorId: number;
  consultationType: 'Chat' | 'Video';
  preferredTime: string;
  reason: string;
}

export interface PatientProfile {
  id: number;
  username: string;
  fullName: string;
}

export interface LoginResponse {
  token: string;
  patient: PatientProfile;
}

@Injectable({ providedIn: 'root' })
export class HealthLinkApiService {
  private readonly sessionKey = 'healthlink-session';

  constructor(private readonly http: HttpClient) {}

  hasSession(): boolean {
    return Boolean(sessionStorage.getItem(this.sessionKey));
  }

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>('/api/auth/login', { username, password }).pipe(
      tap(({ token }) => sessionStorage.setItem(this.sessionKey, token))
    );
  }

  getCurrentPatient(): Observable<PatientProfile> {
    return this.http.get<PatientProfile>('/api/auth/me', this.authOptions());
  }

  clearSession(): void {
    sessionStorage.removeItem(this.sessionKey);
  }

  logout(): Observable<void> {
    const token = sessionStorage.getItem(this.sessionKey);
    this.clearSession();
    return token
      ? this.http.post<void>('/api/auth/logout', {}, this.authOptions(token))
      : of(undefined);
  }

  getDoctors(): Observable<Doctor[]> {
    return this.http.get<Doctor[]>('/api/doctors', this.authOptions());
  }

  getConsultations(): Observable<Consultation[]> {
    return this.http.get<Consultation[]>('/api/consultations', this.authOptions());
  }

  bookConsultation(consultation: NewConsultation): Observable<Consultation> {
    return this.http.post<Consultation>('/api/consultations', consultation, this.authOptions());
  }

  cancelConsultation(id: string): Observable<Consultation> {
    return this.http.patch<Consultation>(`/api/consultations/${id}/cancel`, {}, this.authOptions());
  }

  private authOptions(token = sessionStorage.getItem(this.sessionKey) ?? ''): { headers: HttpHeaders } {
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) };
  }
}