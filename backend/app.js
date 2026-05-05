// Utility functions for UI
const showView = (viewId) => {
    document.getElementById('home-view')?.classList.add('hidden');
    document.getElementById('login-view')?.classList.add('hidden');
    document.getElementById('register-view')?.classList.add('hidden');
    document.getElementById('dashboard-view')?.classList.add('hidden');
    document.getElementById('demo-users-view')?.classList.add('hidden');
    document.getElementById(viewId)?.classList.remove('hidden');

    if (viewId === 'login-view') {
        document.getElementById('demo-users-view')?.classList.remove('hidden');
    }
};

const clearErrors = () => {
    const loginErr = document.getElementById('login-error');
    const regErr = document.getElementById('register-error');
    const successMsg = document.getElementById('login-success-msg');
    if (loginErr) loginErr.textContent = '';
    if (regErr) regErr.textContent = '';
    if (successMsg) successMsg.style.display = 'none';
};

// DOM Elements
const showRegisterBtn = document.getElementById('show-register');
const showLoginBtn = document.getElementById('show-login');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const logoutBtn = document.getElementById('logout-btn');
const searchForm = document.getElementById('search-form');

// Component Loader
const loadComponent = async (elementId, componentPath) => {
    const el = document.getElementById(elementId);
    if (el) {
        try {
            const response = await fetch(componentPath);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            el.innerHTML = await response.text();
            if (elementId === 'header-placeholder') {
                initializeHeaderLogic();
            }
        } catch (error) {
            console.error(`Error loading component ${componentPath}:`, error);
            el.innerHTML = `<p class="error text-center p-3">Failed to load component. Please ensure you are viewing this via a local server (like VS Code Live Server) and not directly via file://.</p>`;
        }
    }
};

// Initialize Header Event Listeners
const initializeHeaderLogic = () => {
    const navLoginBtn = document.getElementById('nav-login');

    // Add active class to current page link for visual feedback
    const navLinks = document.querySelectorAll('.nav-links a');
    const currentPageFilename = window.location.pathname.split('/').pop();

    navLinks.forEach(link => {
        const linkFilename = link.getAttribute('href').split('/').pop();
        if (currentPageFilename === linkFilename) {
            link.classList.add('active');
        }
    });
    
    // Header Scroll Animation Logic
    const mainHeader = document.querySelector('.main-header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
            mainHeader?.classList.add('scrolled');
        } else {
            mainHeader?.classList.remove('scrolled');
        }

        // Scroll to Top Button Logic
        const scrollTopBtn = document.getElementById('scroll-top-btn');
        if (scrollTopBtn) {
            if (window.scrollY > 300) {
                scrollTopBtn.classList.add('show');
            } else {
                scrollTopBtn.classList.remove('show');
            }
        }
    });

    if (navLoginBtn) {
        navLoginBtn.addEventListener('click', (e) => {
            const currentUser = sessionStorage.getItem('currentUser');
            const currentRole = sessionStorage.getItem('currentRole') || 'user';
            
            if (currentUser) {
                e.preventDefault();
                if (window.redirectToDashboard) window.redirectToDashboard();
            } else if (!currentUser && document.getElementById('login-view')) {
                e.preventDefault();
                clearErrors();
                showView('login-view');
            }
        });
    }

    // Update nav text based on auth
    checkAuthStatus();
};

// Event Listeners for Navigation
if (showRegisterBtn) {
    showRegisterBtn.addEventListener('click', (e) => {
        e.preventDefault();
        clearErrors();
        showView('register-view');
    });
}

if (showLoginBtn) {
    showLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        clearErrors();
        showView('login-view');
    });
}

const performSearch = () => {
    // Safely grab values (using optional chaining ? in case they are missing)
    const locationInput = document.getElementById('location')?.value.toLowerCase().trim() || '';
    const checkinInput = document.getElementById('checkin')?.value || '';
    const checkoutInput = document.getElementById('checkout')?.value || '';
    const guestsInput = parseInt(document.getElementById('guests')?.value) || 0;
    const maxPriceVal = document.getElementById('max-price')?.value;
    const maxPriceInput = maxPriceVal ? parseFloat(maxPriceVal) : Infinity;

    const isSearchActive = locationInput || checkinInput || checkoutInput || guestsInput > 0 || (maxPriceVal && maxPriceVal !== '');

    const listingCards = document.querySelectorAll('.listing-card');
    let visibleCount = 0;
    let nonMatchCount = 0;
    let dateConflictCount = 0;
    
    // Retrieve all saved bookings from LocalStorage to check for date overlaps
    const allBookings = getBookings(); 

    listingCards.forEach(card => {
        const propertyName = card.querySelector('h3')?.textContent.trim() || '';
        const cardLocation = card.dataset.location || '';
        const cardGuests = parseInt(card.dataset.guests) || 0;
        const cardRate = parseFloat(card.dataset.rate) || 0;
        
        // Safely handle missing dates, "undefined", "null", or weird strings from old local storage data
        let availableStart = card.dataset.availableStart;
        if (!availableStart || !availableStart.includes('-')) availableStart = '2000-01-01';
        
        let availableEnd = card.dataset.availableEnd;
        if (!availableEnd || !availableEnd.includes('-')) availableEnd = '2099-12-31';

        // 1. Basic Criteria Matches
        let matchLocation = !locationInput || cardLocation.includes(locationInput);
        let matchGuests = !guestsInput || cardGuests >= guestsInput;
        let matchPrice = cardRate <= maxPriceInput;
        let matchDates = true;
        let isInvalidInput = false;
        let isFullyBooked = false;

        // 2. Global Date Range Validation against property availability
        if (checkinInput && checkoutInput) {
            if (checkinInput >= checkoutInput) {
                matchDates = false;
                isInvalidInput = true; // Don't flag as fully booked if dates are just backwards
            } else if (checkinInput < availableStart || checkoutInput > availableEnd) {
                matchDates = false;
            }
        } else if (checkinInput && (checkinInput < availableStart || checkinInput > availableEnd)) {
            matchDates = false;
        } else if (checkoutInput && (checkoutInput < availableStart || checkoutInput > availableEnd)) {
            matchDates = false;
        }

        // 3. OVERLAP CHECK: Check against existing upcoming bookings for this specific property
        if (matchDates && (checkinInput || checkoutInput)) {
            const propertyBookings = allBookings.filter(b => b.property === propertyName && b.status === 'upcoming');
            
            for (let b of propertyBookings) {
                if (b.checkin && b.checkout) {
                    if (checkinInput && checkoutInput) {
                        // Overlap condition: requested check-in is before booked check-out AND requested check-out is after booked check-in
                        if (checkinInput < b.checkout && checkoutInput > b.checkin) {
                            matchDates = false;
                            isFullyBooked = true;
                            break;
                        }
                    } else if (checkinInput) {
                        // Only check-in provided: does it fall inside a booked period?
                        if (checkinInput >= b.checkin && checkinInput < b.checkout) {
                            matchDates = false;
                            isFullyBooked = true;
                            break;
                        }
                    } else if (checkoutInput) {
                        // Only check-out provided: does it fall inside a booked period?
                        if (checkoutInput > b.checkin && checkoutInput <= b.checkout) {
                            matchDates = false;
                            isFullyBooked = true;
                            break;
                        }
                    }
                }
            }
        }

        // Cleanup previous state (if search changes)
        const existingWarning = card.querySelector('.date-conflict-warning');
        if (existingWarning) existingWarning.remove();
        card.style.opacity = '1';
        const bookBtn = card.querySelector('.book-btn');
        if (bookBtn) {
            bookBtn.disabled = false;
            bookBtn.textContent = 'Book Now';
        }

        // 4. Display Logic (Reorder instead of hiding)
        card.style.display = 'flex'; 
        
        const isDateConflict = matchLocation && matchGuests && matchPrice && isFullyBooked;

        if (matchLocation && matchGuests && matchDates && matchPrice) {
            card.style.order = '-3';
            visibleCount++;
        } else if (isDateConflict) {
            card.style.order = '-1';
            dateConflictCount++;
            
            const warning = document.createElement('div');
            warning.className = 'date-conflict-warning text-crimson font-bold mb-2';
            warning.style.fontSize = '0.85rem';
            warning.innerHTML = '⚠️ Fully booked for selected dates';
            
            const cardContent = card.querySelector('.card-content');
            cardContent.insertBefore(warning, cardContent.querySelector('.price'));
            
            if (bookBtn) { bookBtn.disabled = true; bookBtn.textContent = 'Unavailable'; }
            card.style.opacity = '0.65';
        } else {
            card.style.order = '1';
            nonMatchCount++;
        }
    });

    // Separator and Not Found Message Logic
    if (listingCards.length > 0) {
        const container = listingCards[0].parentElement;

        let notFoundMsg = document.getElementById('not-found-msg');
        if (!notFoundMsg) {
            notFoundMsg = document.createElement('div');
            notFoundMsg.id = 'not-found-msg';
            notFoundMsg.className = 'search-not-found-msg';
            notFoundMsg.style.order = '-4';
            notFoundMsg.innerHTML = `
                <h3 class="text-primary mb-1">No Exact Matches Found</h3>
                <p class="text-muted mb-0">We couldn't find properties matching all your specific criteria, but here are some other incredible places you might love.</p>
            `;
            container.appendChild(notFoundMsg);
        }
        notFoundMsg.style.display = (isSearchActive && visibleCount === 0 && dateConflictCount === 0) ? 'block' : 'none';

        // Date Conflict Dynamic Message
        let conflictMsg = document.getElementById('date-conflict-msg');
        if (!conflictMsg) {
            conflictMsg = document.createElement('div');
            conflictMsg.id = 'date-conflict-msg';
            container.appendChild(conflictMsg);
        }
        if (isSearchActive && dateConflictCount > 0) {
            conflictMsg.style.display = 'block';
            conflictMsg.style.order = '-2';
            if (visibleCount > 0) {
                conflictMsg.className = 'search-separator text-crimson';
                conflictMsg.innerHTML = 'Also matching your criteria (Fully Booked)';
                conflictMsg.style.border = 'none';
                conflictMsg.style.borderTop = '1px solid var(--border-color)';
                conflictMsg.style.backgroundColor = 'transparent';
            } else {
                conflictMsg.className = 'search-not-found-msg';
                conflictMsg.style.border = '1px dashed var(--accent-crimson)';
                conflictMsg.style.backgroundColor = 'rgba(251, 113, 133, 0.05)';
                conflictMsg.innerHTML = `
                    <h3 class="text-crimson mb-1">Your Top Picks Are Fully Booked</h3>
                    <p class="text-muted mb-0">These properties match your criteria, but are already booked for your selected dates. Check out other available places below!</p>
                `;
            }
        } else {
            conflictMsg.style.display = 'none';
        }

        let separator = document.getElementById('search-separator');
        if (!separator) {
            separator = document.createElement('div');
            separator.id = 'search-separator';
            separator.className = 'search-separator';
            separator.textContent = 'Other Available Properties';
            container.appendChild(separator);
        }
        separator.style.order = '0';
        separator.style.display = (isSearchActive && (visibleCount > 0 || dateConflictCount > 0) && nonMatchCount > 0) ? 'block' : 'none';
    }
};

// Search Bar Logic
if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        performSearch();
    });
}

// Hardcoded roles extracted for UI display
const hardcodedUsers = [
    { username: 'superadmin', password: 'superadmin', role: 'superadmin' },
    { username: 'admin', password: 'admin', role: 'admin' },
    { username: 'user', password: 'user', role: 'user' }
];

// Authentication Logic using LocalStorage
const getUsers = () => JSON.parse(localStorage.getItem('users')) || [];
const saveUser = (user) => {
    const users = getUsers();
    users.push(user);
    localStorage.setItem('users', JSON.stringify(users));
};

// Bookings Database Logic using LocalStorage
const getBookings = () => JSON.parse(localStorage.getItem('bookings')) || [];
const saveBooking = (booking) => {
    const bookings = getBookings();
    bookings.push(booking);
    localStorage.setItem('bookings', JSON.stringify(bookings));
};

// Properties Database Logic using LocalStorage
const initProperties = () => {
    if (!localStorage.getItem('properties')) {
        const initialProps = [
            { id: 'p1', name: 'Monumento City Loft', location: 'Caloocan City, Metro Manila', price: 3500, rating: 0, reviews: 0, imageClass: 'img-neon', availableStart: '2024-01-01', availableEnd: '2099-12-31', guests: 2, beds: '1 Studio' },
            { id: 'p2', name: 'Malabon Cozy Cabin', location: 'Malabon City, Metro Manila', price: 4200, rating: 0, reviews: 0, imageClass: 'img-crimson', availableStart: '2024-01-01', availableEnd: '2099-12-31', guests: 4, beds: '2 Bedrooms' },
            { id: 'p3', name: 'Valenzuela Resort', location: 'Valenzuela City, Metro Manila', price: 5000, rating: 0, reviews: 0, imageClass: 'img-azure', availableStart: '2024-01-01', availableEnd: '2099-12-31', guests: 6, beds: '3 Bedrooms' },
            { id: 'p4', name: 'Marilao Nature Retreat', location: 'Marilao, Bulacan', price: 4800, rating: 0, reviews: 0, imageClass: 'img-emerald', availableStart: '2024-01-01', availableEnd: '2099-12-31', guests: 2, beds: '1 Bedroom' }
        ];
        localStorage.setItem('properties', JSON.stringify(initialProps));
    }
};
const getProperties = () => JSON.parse(localStorage.getItem('properties')) || [];

// Register
if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value.trim();
        const password = document.getElementById('register-password').value;
        const errorElement = document.getElementById('register-error');

        const users = getUsers();
        if (users.find(u => u.username === username)) {
            errorElement.textContent = 'Username already exists.';
            return;
        }

        // Note: Storing plaintext passwords is for demonstration only!
        saveUser({ username, password });
        registerForm.reset();
        clearErrors();
        showView('login-view');
        
        const successMsg = document.getElementById('login-success-msg');
        if (successMsg) {
            successMsg.textContent = 'Registration successful! Please login.';
            successMsg.classList.remove('hidden');
        }
    });
}

// Login
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const errorElement = document.getElementById('login-error');

        const users = getUsers();
        

        const user = hardcodedUsers.find(u => u.username === username && u.password === password) 
                  || users.find(u => u.username === username && u.password === password);

        if (user) {
            const role = user.role || 'user'; // Newly registered users default to 'user'
            sessionStorage.setItem('currentUser', username);
            sessionStorage.setItem('currentRole', role);
            loginForm.reset();
            clearErrors();
            
            if (window.redirectToDashboard) window.redirectToDashboard();
        } else {
            errorElement.textContent = 'Invalid username or password.';
        }
    });
}

// Logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
        if (window.logout) window.logout();
    });
}

// Login Prompt Modal Logic
const showLoginPromptModal = () => {
    let modal = document.getElementById('login-prompt-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'login-prompt-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="card text-center m-0 mx-1 max-w-400">
                <h2 class="mb-2">Authentication Required</h2>
                <p class="subtitle mb-4">Please login or register to book a property.</p>
                <div class="flex-col gap-1">
                    <button id="login-redirect-btn" class="btn btn-primary btn-glow w-100">Go to Login</button>
                    <button id="cancel-prompt-btn" class="btn btn-outline w-100">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('login-redirect-btn').addEventListener('click', () => window.location.href = '../general/auth.html');
        document.getElementById('cancel-prompt-btn').addEventListener('click', () => modal.classList.add('hidden'));
    }
    modal.classList.remove('hidden');
};

// Booking Logic
const setupBookingButtons = () => {
    document.querySelectorAll('.book-btn').forEach(btn => {
        // Remove existing listener to prevent duplicates if called multiple times
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.addEventListener('click', (e) => {
            const currentUser = sessionStorage.getItem('currentUser');
            if (!currentUser) {
                e.preventDefault();
                showLoginPromptModal();
                return;
            }

            const card = e.target.closest('.listing-card');
            if (card) {
                const propertyName = card.querySelector('h3').textContent;
                const location = card.querySelector('.location').textContent;
                const price = card.querySelector('.price').textContent;
                const guests = card.dataset.guests;
                
                sessionStorage.setItem('pendingBooking', JSON.stringify({
                    property: propertyName,
                    location: location,
                    price: price,
                    guests: guests
                }));
                
                window.location.href = '../general/checkout.html';
            }
        });
    });
};

// Auth State Check
const checkAuthStatus = () => {
    const currentUser = sessionStorage.getItem('currentUser');
    const navLoginBtn = document.getElementById('nav-login');

    if (currentUser) {
        const userDisplay = document.getElementById('user-display');
        if (userDisplay) userDisplay.textContent = currentUser;

        // If visiting auth page while logged in, redirect to correct dashboard
        if (window.location.pathname.includes('auth.html')) {
            if (window.redirectToDashboard) window.redirectToDashboard();
            return;
        }

        if (document.getElementById('dashboard-view')) {
            showView('dashboard-view');
        }
        if (navLoginBtn) navLoginBtn.textContent = 'Dashboard';
    } else {
        if (document.getElementById('home-view')) {
            showView('home-view');
        } else if (document.getElementById('login-view')) {
            showView('login-view');
        }
        if (navLoginBtn) navLoginBtn.textContent = 'Login/Register';
    }

    // Apply UI role visibility based on hierarchy
    if (window.applyRoleVisibility) {
        window.applyRoleVisibility();
    }
};

// Setup Tabs Logic
const setupTabs = () => {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabId = e.target.getAttribute('data-tab');
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.getElementById(tabId)?.classList.add('active');
            e.currentTarget.classList.add('active');
        });
    });
};

// Render Bookings Logic
const renderUserBookings = () => {
    const currentUser = sessionStorage.getItem('currentUser');
    if (!currentUser) return;

    const allBookings = getBookings();
    const userBookings = allBookings.filter(b => b.user === currentUser);

    // 1. My Bookings Page
    const upcomingContainer = document.getElementById('upcoming-container');
    const pastContainer = document.getElementById('past-container');
    const canceledContainer = document.getElementById('canceled-container');

    if (upcomingContainer && pastContainer && canceledContainer) {
        const upcoming = userBookings.filter(b => b.status === 'upcoming');
        const past = userBookings.filter(b => b.status === 'past');
        const canceled = userBookings.filter(b => b.status === 'canceled');
        const props = getProperties();

        const createBookingHTML = (b, colorClass, glowClass) => {
            let actionBtn = '';
            if (b.status === 'upcoming') {
                actionBtn = `<button class="btn btn-outline btn-glow mt-3 w-fit complete-stay-btn" data-id="${b.id}" data-property="${b.property}">Complete Stay & Review</button>`;
            } else if (b.status === 'past' && b.userRating) {
                actionBtn = `<p class="text-muted mt-2" style="font-size: 0.9rem;">Your Rating: <span class="text-primary font-bold">★ ${b.userRating}/5</span><br>"${b.userReview}"</p>`;
            }
            
            const propertyInfo = props.find(p => p.name === b.property);
            const guestText = propertyInfo ? ` | Recommended: ${propertyInfo.guests} person(s)` : '';
            const bedText = propertyInfo && propertyInfo.beds ? ` | ${propertyInfo.beds}` : '';

            return `
                <div class="glass-panel ${glowClass} p-4 flex-col">
                    <h3>${b.property}</h3>
                    <p class="text-muted">Location: ${b.location} | Price: ${b.price}${guestText}${bedText}</p>
                    <p class="${colorClass} mt-3 font-bold mb-0">Status: ${b.status.charAt(0).toUpperCase() + b.status.slice(1)} (Booked on ${b.dateBooked})</p>
                    ${actionBtn}
                </div>
            `;
        };

        upcomingContainer.innerHTML = upcoming.length > 0 
            ? upcoming.map(b => createBookingHTML(b, 'text-green', 'glass-panel-glow-green')).join('')
            : '<p class="text-muted">No upcoming adventures yet.</p>';
            
        pastContainer.innerHTML = past.length > 0 
            ? past.map(b => createBookingHTML(b, 'text-gold', 'glass-panel-glow-gold')).join('')
            : '<p class="text-muted">No past memories found.</p>';
            
        canceledContainer.innerHTML = canceled.length > 0 
            ? canceled.map(b => createBookingHTML(b, 'text-crimson', 'glass-panel-glow-crimson')).join('')
            : '<p class="text-muted">No canceled trips.</p>';
            
        // Bind complete stay buttons
        document.querySelectorAll('.complete-stay-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const bookingId = e.target.getAttribute('data-id');
                const propertyName = e.target.getAttribute('data-property');
                const modal = document.getElementById('review-modal');
                if (modal) {
                    document.getElementById('review-booking-id').value = bookingId;
                    document.getElementById('review-property-name').textContent = propertyName;
                    modal.classList.remove('hidden');
                }
            });
        });
    }

    // 2. User Dashboard Page
    const dashboardContainer = document.getElementById('dashboard-recent-bookings');
    if (dashboardContainer) {
        if (userBookings.length > 0) {
            const props = getProperties();
            const recent = userBookings.slice(-3).reverse(); // Get latest 3
            dashboardContainer.innerHTML = recent.map(b => {
                const propertyInfo = props.find(p => p.name === b.property);
                const guestText = propertyInfo ? ` | Recommended: ${propertyInfo.guests} person(s)` : '';
                return `
                    <div class="glass-panel p-3">
                        <h4 class="text-primary">${b.property}</h4>
                        <p class="text-muted mb-0" style="font-size: 0.85rem;">${b.location}${guestText} - <span style="text-transform: capitalize;">${b.status}</span></p>
                    </div>
                `;
            }).join('');
        } else {
            dashboardContainer.innerHTML = '<p class="text-center text-muted">You have no recent bookings.</p>';
        }
    }
};

// Update Recent Booking Ticker (Home Page)
const updateRecentTicker = () => {
    const ticker = document.getElementById('recent-booking-ticker');
    const tickerText = document.getElementById('ticker-text');
    if (ticker && tickerText) {
        const currentUser = sessionStorage.getItem('currentUser');
        
        if (!currentUser) {
            ticker.classList.add('hidden');
            return;
        }

        const allBookings = getBookings();
        const userBookings = allBookings.filter(b => b.user === currentUser);

        if (userBookings.length > 0) {
            const recent = userBookings.slice(-3).reverse(); // Get latest 3 specific to the user
            const propertyNames = recent.map(b => b.property);
            
            let displayText = '';
            if (propertyNames.length === 1) {
                displayText = propertyNames[0];
            } else if (propertyNames.length === 2) {
                displayText = `${propertyNames[0]} and ${propertyNames[1]}`;
            } else {
                displayText = `${propertyNames[0]}, ${propertyNames[1]}, and ${propertyNames[2]}`;
            }

            tickerText.innerHTML = `<span class="text-primary font-bold">Your Recent Bookings:</span> ${displayText}`;
            ticker.classList.remove('hidden');
        } else {
            ticker.classList.add('hidden');
        }
    }
};

// Render Trending Destinations (Home Page)
const renderTrendingDestinations = () => {
    const grid = document.getElementById('trending-destinations-grid');
    if (grid) {
        let props = getProperties();
        
        // Sort by rating descending. If tied (like all being 0), randomize order.
        props.sort((a, b) => {
            if (b.rating === a.rating) return Math.random() - 0.5;
            return b.rating - a.rating;
        });

        // Limit to 4 properties for the homepage layout
        const topProps = props.slice(0, 4);

        grid.innerHTML = topProps.map(p => `
            <div class="listing-card" data-location="${p.location.toLowerCase()}" data-guests="${p.guests}" data-available-start="${p.availableStart}" data-available-end="${p.availableEnd}" data-rate="${p.price}">
                <div class="card-image ${p.imageClass}"></div>
                <div class="card-content">
                    <h3>${p.name}</h3>
                    <p class="location" style="margin-bottom: 0.25rem;">${p.location}</p>
                    <p class="text-muted mb-1" style="font-size: 0.85rem;">Recommended: ${p.guests} person(s)</p>
                    <p class="text-muted mb-2" style="font-size: 0.85rem;">${p.beds || '1 Bedroom'}</p>
                    <p class="price">₱${p.price.toLocaleString()} / night</p>
                    <div class="card-rating mb-3">
                        <span class="text-primary">★ ${p.rating > 0 ? p.rating.toFixed(1) : 'New'}</span>
                        <span class="text-muted">(${p.reviews} reviews)</span>
                    </div>
                    <button class="btn btn-outline w-100 book-btn">Book Now</button>
                </div>
            </div>
        `).join('');
        
        setupBookingButtons(); // Re-bind the checkout events to these newly injected buttons
    }
};

// Review and Completion Logic
const initReviewLogic = () => {
    const reviewForm = document.getElementById('review-form');
    const cancelBtn = document.getElementById('cancel-review-btn');
    const modal = document.getElementById('review-modal');

    if (cancelBtn && modal) {
        cancelBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
            reviewForm.reset();
        });
    }

    if (reviewForm) {
        reviewForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const bookingId = document.getElementById('review-booking-id').value;
            const rating = parseInt(document.getElementById('review-rating').value);
            const reviewText = document.getElementById('review-text').value;

            // Update Booking Status
            const bookings = getBookings();
            const bookingIndex = bookings.findIndex(b => b.id === bookingId);
            
            if (bookingIndex > -1) {
                const b = bookings[bookingIndex];
                b.status = 'past'; // Moves it to the Past Bookings tab
                b.userRating = rating;
                b.userReview = reviewText;
                
                // Update Property Rating dynamically
                const props = getProperties();
                const propIndex = props.findIndex(p => p.name === b.property);
                if (propIndex > -1) {
                    const p = props[propIndex];
                    const totalScore = (p.rating * p.reviews) + rating;
                    p.reviews += 1;
                    p.rating = totalScore / p.reviews;
                    localStorage.setItem('properties', JSON.stringify(props));
                }

                localStorage.setItem('bookings', JSON.stringify(bookings));

                modal.classList.add('hidden');
                reviewForm.reset();
                renderUserBookings(); // Instantly visually refresh the tabs
                
                alert('Thank you for your review! Your stay has been marked as completed.');
            }
        });
    }
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initProperties();
    loadComponent('header-placeholder', '../components/header.html');
    loadComponent('footer-placeholder', '../components/footer.html');
    checkAuthStatus();

    // Populate Demo Users
    const demoUsersList = document.getElementById('demo-users-list');
    if (demoUsersList) {
        demoUsersList.innerHTML = hardcodedUsers.map(u => `
            <div class="demo-user-card">
                <div class="demo-user-card-header">${u.role} Role</div>
                <div class="demo-user-card-body">
                    <div><strong>Username:</strong> ${u.username}</div>
                    <div><strong>Password:</strong> ${u.password}</div>
                </div>
            </div>
        `).join('');
    }

    // Auth Page Notification Modal Logic
    const authModal = document.getElementById('auth-notification-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    
    if (authModal && closeModalBtn) {
        const currentUser = sessionStorage.getItem('currentUser');
        if (!currentUser) {
            authModal.classList.remove('hidden');
        }
        closeModalBtn.addEventListener('click', () => {
            authModal.classList.add('hidden');
        });
    }

    // Setup booking buttons
    setupBookingButtons();

    // Checkout Logic
    const initCheckout = () => {
        const checkinInput = document.getElementById('checkin-date');
        const checkoutInput = document.getElementById('checkout-date');
        const guestsInput = document.getElementById('guests-count');
        
        if (checkinInput && checkoutInput) {
            const pendingBooking = JSON.parse(sessionStorage.getItem('pendingBooking'));
            
            if (!pendingBooking) {
                alert('No pending booking found. Redirecting to home.');
                window.location.href = 'index.html';
                return;
            }
            
            // Set Initial Receipt Values
            document.getElementById('receipt-property').textContent = pendingBooking.property;
            document.getElementById('receipt-location').textContent = pendingBooking.location;
            
            // Setup Guest Limit Logic
            const recGuests = parseInt(pendingBooking.guests) || 1;
            if (document.getElementById('guest-limit-text')) {
                document.getElementById('guest-limit-text').textContent = `(Recommended: ${recGuests})`;
            }

            // Extract raw number from string like "₱3,500 / night"
            const basePricePerNight = parseFloat(pendingBooking.price.replace(/[^\d.]/g, '')) || 0;

            // Initialize Dates (Default to today and tomorrow)
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const formatDate = (date) => date.toISOString().split('T')[0];
            
            checkinInput.min = formatDate(today);
            checkinInput.value = formatDate(today);
            
            checkoutInput.min = formatDate(tomorrow);
            checkoutInput.value = formatDate(tomorrow);

            // Real-time calculation logic
            const calculateTotals = () => {
                const d1 = new Date(checkinInput.value);
                const d2 = new Date(checkoutInput.value);
                
                // Prevent impossible dates
                if (d2 <= d1) {
                    const nextDay = new Date(d1);
                    nextDay.setDate(nextDay.getDate() + 1);
                    checkoutInput.value = formatDate(nextDay);
                }
                
                const finalD2 = new Date(checkoutInput.value);
                const diffTime = Math.abs(finalD2 - d1);
                const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
                
                document.getElementById('nights-display').textContent = `Total Nights: ${nights}`;

                // Add-ons
                let addonsTotal = 0;
                document.querySelectorAll('.addon-checkbox:checked').forEach(cb => {
                    addonsTotal += parseFloat(cb.value);
                });

                const baseTotal = basePricePerNight * nights;
                const serviceFee = baseTotal * 0.10; // 10% fee
                const grandTotal = baseTotal + serviceFee + addonsTotal;

                // Update Receipt UI
                document.getElementById('receipt-rate').textContent = `₱${basePricePerNight.toLocaleString()} x ${nights} night${nights > 1 ? 's' : ''}`;
                document.getElementById('receipt-base-total').textContent = `₱${baseTotal.toLocaleString()}`;
                document.getElementById('receipt-service').textContent = `₱${serviceFee.toLocaleString()}`;
                
                const addonsRow = document.getElementById('receipt-addons-row');
                if (addonsTotal > 0) {
                    addonsRow.style.display = 'flex';
                    document.getElementById('receipt-addons-total').textContent = `₱${addonsTotal.toLocaleString()}`;
                } else {
                    addonsRow.style.display = 'none';
                }

                document.getElementById('receipt-grand-total').textContent = `₱${grandTotal.toLocaleString()}`;
            };

            // Listeners
            checkinInput.addEventListener('change', calculateTotals);
            checkoutInput.addEventListener('change', calculateTotals);
            document.querySelectorAll('.addon-checkbox').forEach(cb => cb.addEventListener('change', calculateTotals));

            // Guest Limit Warning Toggle
            if (guestsInput) {
                guestsInput.addEventListener('input', (e) => {
                    const val = parseInt(e.target.value) || 1;
                    const warning = document.getElementById('guest-warning');
                    if (warning) {
                        if (val > recGuests) warning.classList.remove('hidden');
                        else warning.classList.add('hidden');
                    }
                });
            }

            // Initial Calculation
            calculateTotals();

            // Payment Method Toggle Logic
            document.querySelectorAll('.payment-method-input').forEach(radio => {
                radio.addEventListener('change', (e) => {
                    const cardDetails = document.getElementById('card-details-section');
                    const gcashDetails = document.getElementById('gcash-details-section');
                    if (e.target.value === 'card') {
                        if (cardDetails) cardDetails.style.display = 'block';
                        if (gcashDetails) gcashDetails.style.display = 'none';
                    } else {
                        if (cardDetails) cardDetails.style.display = 'none'; // Hide if GCash or Maya
                        if (gcashDetails) gcashDetails.style.display = 'block';
                    }
                });
            });

            // Card Number Auto-format (Spaces every 4 digits)
            const cardInput = document.getElementById('card-number');
            if(cardInput) {
                cardInput.addEventListener('input', (e) => {
                    let val = e.target.value.replace(/\D/g, '');
                    e.target.value = val.replace(/(.{4})/g, '$1 ').trim();
                });
            }
            
            // Expiry Date Auto-format (MM/YY)
            const expiryInput = document.getElementById('card-expiry');
            if(expiryInput) {
                expiryInput.addEventListener('input', (e) => {
                    let val = e.target.value.replace(/\D/g, '');
                    if (val.length >= 2) {
                        val = val.substring(0, 2) + '/' + val.substring(2, 4);
                    }
                    e.target.value = val;
                });
            }
            
            const checkoutForm = document.getElementById('checkout-form');
            if (checkoutForm) {
                checkoutForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const submitBtn = document.getElementById('pay-now-btn');
                    submitBtn.innerHTML = '<span class="pulse-dot" style="display:inline-block; margin-right:8px; background-color:white;"></span> Processing...';
                    submitBtn.style.pointerEvents = 'none';
                    submitBtn.style.opacity = '0.8';
                    
                    // Simulate a network request delay
                    setTimeout(() => {
                        const currentUser = sessionStorage.getItem('currentUser');
                        const grandTotalStr = document.getElementById('receipt-grand-total').textContent;
                        
                        const newBooking = {
                            id: 'BKG-' + Date.now().toString(),
                            user: currentUser,
                            property: pendingBooking.property,
                            location: pendingBooking.location,
                            checkin: checkinInput.value,
                            checkout: checkoutInput.value,
                            price: grandTotalStr,
                            status: 'upcoming',
                            dateBooked: new Date().toLocaleDateString()
                        };
                        saveBooking(newBooking);
                        sessionStorage.removeItem('pendingBooking');

                        alert('Booking confirmed successfully! Redirecting you to your dashboard.');
                        if (window.redirectToDashboard) window.redirectToDashboard();
                    }, 1500);
                });
            }
        }
    };
    initCheckout();
    
    const displayDash = document.getElementById('user-display-dash');
    if (displayDash) {
        const username = sessionStorage.getItem('currentUser');
        if (username) displayDash.textContent = username;
    }
    setupTabs();
    initReviewLogic();
    renderUserBookings();
    renderTrendingDestinations();
    updateRecentTicker();

    // Scroll to top button click event
    const scrollTopBtn = document.getElementById('scroll-top-btn');
    if (scrollTopBtn) {
        scrollTopBtn.addEventListener('click', () => {
            document.documentElement.style.scrollBehavior = 'auto'; // Temporarily force instant scroll
            window.scrollTo(0, 0); // Jump to top
            document.documentElement.style.scrollBehavior = ''; // Restore CSS smooth scroll
        });
    }

    // Auto-fill and perform search if URL parameters are present (from index page)
    if (searchForm) {
        const urlParams = new URLSearchParams(window.location.search);
        let hasParams = false;
        
        ['location', 'checkin', 'checkout', 'guests', 'max-price'].forEach(param => {
            if (urlParams.has(param) && urlParams.get(param)) {
                const inputElement = document.getElementById(param);
                if (inputElement) {
                    inputElement.value = urlParams.get(param);
                    hasParams = true;
                }
            }
        });

        if (hasParams) {
            performSearch();
        }
    }
});