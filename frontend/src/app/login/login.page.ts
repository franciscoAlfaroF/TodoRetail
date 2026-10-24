import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastController, LoadingController } from '@ionic/angular/lazy';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage implements OnInit {
  isRegisterMode = false;
  loginForm!: FormGroup;
  registerForm!: FormGroup;
  errorMessage: string | null = null;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
  ) {}

  ngOnInit() {
    this.initForms();
    // Si ya está autenticado, redirigir al home
    if (this.authService.isAuthenticated) {
      this.router.navigate(['/home']);
    }
  }

  initForms() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });

    this.registerForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['USER', [Validators.required]],
    });
  }

  toggleMode(register: boolean) {
    this.isRegisterMode = register;
    this.errorMessage = null;
  }

  async onLogin() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    const { email, password } = this.loginForm.value;

    this.authService.login({ email, password }).subscribe({
      next: async (res) => {
        this.isLoading = false;
        await this.showToast(`¡Bienvenido de vuelta, ${res.user.name || res.user.email}!`, 'success');
        this.router.navigate(['/home']);
      },
      error: async (err) => {
        this.isLoading = false;
        const msg = err.error?.message || 'Error al iniciar sesión. Verifica tus credenciales.';
        this.errorMessage = msg;
        await this.showToast(msg, 'danger');
      },
    });
  }

  async onRegister() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    const formVal = this.registerForm.value;

    this.authService.register(formVal).subscribe({
      next: async (res) => {
        this.isLoading = false;
        await this.showToast('Cuenta creada con éxito. ¡Bienvenido!', 'success');
        this.router.navigate(['/home']);
      },
      error: async (err) => {
        this.isLoading = false;
        const msg = err.error?.message || 'Error al registrar la cuenta.';
        this.errorMessage = msg;
        await this.showToast(msg, 'danger');
      },
    });
  }

  goToHome() {
    this.router.navigate(['/home']);
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}
