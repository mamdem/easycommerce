import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  isLoading = false;
  showPassword = false;
  
  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
      rememberMe: [false]
    });
  }

  ngOnInit(): void {}

  // Getters pour faciliter l'accès aux champs du formulaire
  get email() { return this.loginForm.get('email'); }
  get password() { return this.loginForm.get('password'); }

  // Méthode pour basculer la visibilité du mot de passe
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  // Soumission du formulaire
  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      return;
    }

    this.isLoading = true;

    try {
      const { email, password } = this.loginForm.value;
      await this.authService.login(email, password);
      
      this.toastService.success('Connexion réussie !');
      this.authService.redirectAfterLogin();
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      this.toastService.error('Email ou mot de passe incorrect');
    } finally {
      this.isLoading = false;
    }
  }

  // Connexion avec Google
  async signInWithGoogle(): Promise<void> {
    try {
      await this.authService.loginWithGoogle();
      this.toastService.success('Connexion avec Google réussie !');
      this.authService.redirectAfterGoogleLogin();
    } catch (error) {
      console.error('Erreur lors de la connexion avec Google:', error);
      this.toastService.error('Erreur lors de la connexion avec Google');
    }
  }

  navigateToRegister() {
    this.router.navigate(['/auth/register']);
  }

  navigateToForgotPassword() {
    this.router.navigate(['/auth/forgot-password']);
  }
} 