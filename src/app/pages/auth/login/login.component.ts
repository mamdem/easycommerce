import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loginForm: FormGroup;
  isSubmitting = false;
  errorMessage = '';
  
  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      rememberMe: [false]
    });
  }

  async login() {
    if (this.loginForm.invalid) {
      // Marquer tous les champs comme touchés pour afficher les erreurs
      Object.keys(this.loginForm.controls).forEach(key => {
        this.loginForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    try {
      const email = this.loginForm.get('email')?.value;
      const password = this.loginForm.get('password')?.value;
      
      await this.authService.login(email, password);
      // Utiliser la méthode redirectAfterLogin pour la redirection intelligente
      this.authService.redirectAfterLogin();
    } catch (error: any) {
      console.error('Erreur de connexion:', error);
      
      // Gérer les erreurs d'authentification Firebase
      if (error.code) {
        switch (error.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
            this.errorMessage = 'L\'email ou le mot de passe est incorrect.';
            break;
          case 'auth/too-many-requests':
            this.errorMessage = 'Trop de tentatives de connexion, veuillez réessayer plus tard.';
            break;
          case 'auth/user-disabled':
            this.errorMessage = 'Ce compte a été désactivé.';
            break;
          default:
            this.errorMessage = 'Une erreur est survenue lors de la connexion.';
        }
      } else {
        this.errorMessage = 'Une erreur est survenue lors de la connexion.';
      }
    } finally {
      this.isSubmitting = false;
    }
  }

  async loginWithGoogle() {
    this.isSubmitting = true;
    this.errorMessage = '';

    try {
      // Pas besoin de passer le type d'utilisateur ici, car c'est une connexion (pas une inscription)
      await this.authService.loginWithGoogle();
      // Après connexion réussie, rediriger
      this.authService.redirectAfterLogin();
    } catch (error: any) {
      console.error('Erreur de connexion avec Google:', error);
      this.errorMessage = 'Une erreur est survenue lors de la connexion avec Google.';
    } finally {
      this.isSubmitting = false;
    }
  }

  async loginWithFacebook() {
    this.isSubmitting = true;
    this.errorMessage = '';

    try {
      // Pas besoin de passer le type d'utilisateur ici, car c'est une connexion (pas une inscription)
      await this.authService.loginWithFacebook();
      // Après connexion réussie, rediriger
      this.authService.redirectAfterLogin();
    } catch (error: any) {
      console.error('Erreur de connexion avec Facebook:', error);
      this.errorMessage = 'Une erreur est survenue lors de la connexion avec Facebook.';
    } finally {
      this.isSubmitting = false;
    }
  }

  navigateToRegister() {
    this.router.navigate(['/auth/register']);
  }

  navigateToForgotPassword() {
    this.router.navigate(['/auth/forgot-password']);
  }
} 