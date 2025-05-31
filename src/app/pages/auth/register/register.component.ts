import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  registerForm: FormGroup;
  isSubmitting = false;
  errorMessage = '';
  userTypes = [
    { id: 'customer', label: 'Client' },
    { id: 'merchant', label: 'Commerçant' }
  ];
  
  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private userService: UserService
  ) {
    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: [''],
      userType: ['customer', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      termsAccepted: [false, Validators.requiredTrue]
    }, { validators: this.passwordMatchValidator });
  }

  // Validateur personnalisé pour vérifier que les mots de passe correspondent
  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    
    if (password !== confirmPassword) {
      control.get('confirmPassword')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    return null;
  }

  async register() {
    if (this.registerForm.invalid) {
      // Marquer tous les champs comme touchés pour afficher les erreurs
      Object.keys(this.registerForm.controls).forEach(key => {
        this.registerForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const email = this.registerForm.get('email')?.value;
    const password = this.registerForm.get('password')?.value;
    const userType = this.registerForm.get('userType')?.value;
    const userData = {
      firstName: this.registerForm.get('firstName')?.value,
      lastName: this.registerForm.get('lastName')?.value,
      phoneNumber: this.registerForm.get('phoneNumber')?.value
    };

    try {
      await this.authService.register(email, password, userType, userData);
      // Utiliser la méthode redirectAfterLogin pour la redirection intelligente
      this.authService.redirectAfterLogin();
    } catch (error: any) {
      console.error('Erreur d\'inscription:', error);
      
      // Gérer les erreurs d'authentification Firebase
      if (error.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            this.errorMessage = 'Cet email est déjà utilisé par un autre compte.';
            break;
          case 'auth/invalid-email':
            this.errorMessage = 'L\'adresse email est invalide.';
            break;
          case 'auth/weak-password':
            this.errorMessage = 'Le mot de passe est trop faible. Utilisez au moins 6 caractères.';
            break;
          case 'auth/operation-not-allowed':
            this.errorMessage = 'Cette méthode d\'inscription n\'est pas activée.';
            break;
          default:
            this.errorMessage = 'Une erreur est survenue lors de l\'inscription.';
        }
      } else {
        this.errorMessage = 'Une erreur est survenue lors de l\'inscription.';
      }
    } finally {
      this.isSubmitting = false;
    }
  }

  async registerWithGoogle() {
    this.isSubmitting = true;
    this.errorMessage = '';

    try {
      // Pour l'inscription avec Google, on récupère le type d'utilisateur du formulaire
      const userType = this.registerForm.get('userType')?.value;
      
      // Sauvegarde du type d'utilisateur temporairement pour que la méthode loginWithGoogle puisse le récupérer
      localStorage.setItem('userType', userType);
      
      // Connexion avec Google qui crée aussi l'utilisateur dans Firestore
      await this.authService.loginWithGoogle();
      
      // Après connexion réussie, rediriger
      this.authService.redirectAfterLogin();
    } catch (error: any) {
      console.error('Erreur d\'inscription avec Google:', error);
      this.errorMessage = 'Une erreur est survenue lors de l\'inscription avec Google.';
    } finally {
      this.isSubmitting = false;
    }
  }

  async registerWithFacebook() {
    this.isSubmitting = true;
    this.errorMessage = '';

    try {
      // Pour l'inscription avec Facebook, on récupère le type d'utilisateur du formulaire
      const userType = this.registerForm.get('userType')?.value;
      
      // Sauvegarde du type d'utilisateur temporairement pour que la méthode loginWithFacebook puisse le récupérer
      localStorage.setItem('userType', userType);
      
      // Connexion avec Facebook qui crée aussi l'utilisateur dans Firestore
      await this.authService.loginWithFacebook();
      
      // Après connexion réussie, rediriger
      this.authService.redirectAfterLogin();
    } catch (error: any) {
      console.error('Erreur d\'inscription avec Facebook:', error);
      this.errorMessage = 'Une erreur est survenue lors de l\'inscription avec Facebook.';
    } finally {
      this.isSubmitting = false;
    }
  }

  navigateToLogin() {
    this.router.navigate(['/auth/login']);
  }
} 