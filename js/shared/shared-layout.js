/**
 * Shared Layout Module
 * Handles sidebar toggle, navigation, and common UI interactions
 */

import { sessionChecker } from '../modules/auth/auth-sessionCheckerModule.js';

class SharedLayout {
    constructor() {
        this.sidebar = null;
        this.sidebarToggle = null;
        this.overlay = null;
    }

    async init() {
        // Initialize session checker
        const user = await sessionChecker.init({ redirectIfNotAuth: true });
        
        if (!user) return null;

        this.setupElements();
        this.bindEvents();
        this.setActiveNavItem();
        this.updateUserInfo(user);

        return user;
    }

    setupElements() {
        this.sidebar = document.getElementById('sidebar');
        this.sidebarToggle = document.getElementById('sidebarToggle');

        // Create overlay for mobile
        if (!document.querySelector('.sidebar-overlay')) {
            this.overlay = document.createElement('div');
            this.overlay.className = 'sidebar-overlay';
            document.body.appendChild(this.overlay);
        } else {
            this.overlay = document.querySelector('.sidebar-overlay');
        }
    }

    bindEvents() {
        // Sidebar toggle
        if (this.sidebarToggle) {
            this.sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        }

        // Overlay click (mobile)
        if (this.overlay) {
            this.overlay.addEventListener('click', () => this.closeSidebar());
        }

        // Use event delegation for logout buttons to handle dynamic elements
        document.addEventListener('click', (e) => {
            if (e.target.closest('#logoutBtn') || e.target.closest('#headerLogoutBtn')) {
                e.preventDefault();
                e.stopPropagation();
                this.handleLogout();
            }
        });

        // Also attach direct listeners as fallback
        setTimeout(() => {
            const logoutBtn = document.getElementById('logoutBtn');
            const headerLogoutBtn = document.getElementById('headerLogoutBtn');

            if (logoutBtn) {
                logoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.handleLogout();
                });
            }

            if (headerLogoutBtn) {
                headerLogoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.handleLogout();
                });
            }
        }, 100);

        // Handle window resize
        window.addEventListener('resize', () => {
            if (window.innerWidth > 991) {
                this.closeSidebar();
            }
        });
    }

    toggleSidebar() {
        if (window.innerWidth <= 991) {
            // Mobile: show/hide
            this.sidebar?.classList.toggle('show');
            this.overlay?.classList.toggle('show');
        } else {
            // Desktop: collapse/expand
            this.sidebar?.classList.toggle('collapsed');
        }
    }

    closeSidebar() {
        this.sidebar?.classList.remove('show');
        this.overlay?.classList.remove('show');
    }

    setActiveNavItem() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.sidebar-nav .nav-link');

        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            const parent = link.closest('.nav-item');

            if (href && currentPath.includes(href.replace('../', '').replace('.html', ''))) {
                parent?.classList.add('active');
            } else {
                parent?.classList.remove('active');
            }
        });
    }

    updateUserInfo(user) {
        // Use setTimeout to ensure DOM is fully ready
        setTimeout(() => {
            const headerUserName = document.getElementById('headerUserName');
            const headerUserRole = document.getElementById('headerUserRole');

            if (headerUserName && user && user.name) {
                headerUserName.textContent = user.name;
            }

            if (headerUserRole && user && user.type_name) {
                headerUserRole.textContent = user.type_name;
            }
        }, 100);
    }

    async handleLogout() {
        const result = await Swal.fire({
            title: 'Logout',
            text: 'Are you sure you want to logout?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            confirmButtonText: 'Yes, logout',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            await sessionChecker.logout();
        }
    }
}

export const sharedLayout = new SharedLayout();
export default sharedLayout;

