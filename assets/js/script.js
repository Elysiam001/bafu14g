/**
 * Tài Xỉu Bafu - Frontend Only Version
 * No Backend Required. Works by opening index.html directly.
 */

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const toRegisterBtn = document.getElementById('to-register');
    const toLoginBtn = document.getElementById('to-login');

    // --- Mobile Menu Toggle ---
    const mobileMenu = document.getElementById('mobile-menu');
    const navLinks = document.getElementById('nav-links');

    if (mobileMenu) {
        mobileMenu.addEventListener('click', () => {
            navLinks.classList.toggle('show');
            const icon = mobileMenu.querySelector('i');
            icon.classList.toggle('fa-bars');
            icon.classList.toggle('fa-times');
        });
    }

    // --- Form Toggling Logic ---
    const showRegister = () => {
        loginForm.classList.remove('active');
        registerForm.classList.add('active');
    };

    const showLogin = () => {
        registerForm.classList.remove('active');
        loginForm.classList.add('active');
    };

    if(toRegisterBtn) toRegisterBtn.addEventListener('click', showRegister);
    if(toLoginBtn) toLoginBtn.addEventListener('click', showLogin);

    // --- Password Visibility ---
    const togglePass = document.querySelector('.toggle-pass');
    if (togglePass) {
        togglePass.addEventListener('click', function() {
            const passInput = document.getElementById('login-password');
            if (passInput.type === 'password') {
                passInput.type = 'text';
                this.classList.replace('fa-eye-slash', 'fa-eye');
            } else {
                passInput.type = 'password';
                this.classList.replace('fa-eye', 'fa-eye-slash');
            }
        });
    }

    // --- Mock Authentication (Local Test Only) ---
    
    // Mock Login
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        alert('Chào mừng ' + username + '! Bạn đã đăng nhập thành công (Bản Demo).');
        // Redirect to profile or game
        window.location.href = 'profile.html';
    });

    // Mock Register
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('reg-username').value;
        const email = document.getElementById('reg-email').value;
        const pass = document.getElementById('reg-password').value;
        const confirmPass = document.getElementById('reg-confirm-password').value;

        if (pass !== confirmPass) {
            alert('Lỗi: Mật khẩu nhập lại không khớp!');
            return;
        }

        // --- LƯU VÀO DATABASE GIẢ LẬP ---
        let users = JSON.parse(localStorage.getItem('casino_users') || '[]');
        const newUser = {
            username: username,
            email: email,
            balance: 0,
            joinedDate: new Date().toLocaleDateString('vi-VN'),
            status: 'Active'
        };
        users.push(newUser);
        localStorage.setItem('casino_users', JSON.stringify(users));

        alert('Chúc mừng ' + username + '! Bạn đã tạo tài khoản thành công.');
        showLogin();
    });
});
