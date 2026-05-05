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
    const typeInput = document.getElementById('property-type')?.value.toLowerCase().trim() || document.getElementById('hero-type')?.value.toLowerCase().trim() || '';

    const isSearchActive = locationInput || checkinInput || checkoutInput || guestsInput > 1 || (maxPriceVal && maxPriceVal !== '') || typeInput !== '';

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
        let cardType = card.dataset.type || 'studio';
        let matchType = !typeInput || cardType === typeInput;
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
        let conflictingDatesStr = '';
        if (matchDates && (checkinInput || checkoutInput)) {
            const propertyBookings = allBookings.filter(b => b.property === propertyName && b.status === 'upcoming');
            const formatF = (dateStr) => new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            
            for (let b of propertyBookings) {
                if (b.checkin && b.checkout) {
                    let hasOverlap = false;
                    if (checkinInput && checkoutInput) {
                        // Overlap condition: requested check-in is before booked check-out AND requested check-out is after booked check-in
                        if (checkinInput < b.checkout && checkoutInput > b.checkin) {
                            hasOverlap = true;
                        }
                    } else if (checkinInput) {
                        // Only check-in provided: does it fall inside a booked period?
                        if (checkinInput >= b.checkin && checkinInput < b.checkout) {
                            hasOverlap = true;
                        }
                    } else if (checkoutInput) {
                        // Only check-out provided: does it fall inside a booked period?
                        if (checkoutInput > b.checkin && checkoutInput <= b.checkout) {
                            hasOverlap = true;
                        }
                    }
                    
                    if (hasOverlap) {
                        matchDates = false;
                        isFullyBooked = true;
                        conflictingDatesStr += `${formatF(b.checkin)} - ${formatF(b.checkout)}, `;
                    }
                }
            }
        }
        if (conflictingDatesStr) conflictingDatesStr = conflictingDatesStr.slice(0, -2);

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
        
        const isDateConflict = matchLocation && matchGuests && matchPrice && matchType && isFullyBooked;

        if (matchLocation && matchGuests && matchDates && matchPrice && matchType) {
            card.style.order = '-3';
            visibleCount++;
        } else if (isDateConflict) {
            card.style.order = '-1';
            dateConflictCount++;
            
            const warning = document.createElement('div');
            warning.className = 'date-conflict-warning text-crimson font-bold mb-2';
            warning.style.fontSize = '0.85rem';
            warning.innerHTML = conflictingDatesStr 
                ? `⚠️ Booked on: <span style="font-weight:normal;">${conflictingDatesStr}</span>`
                : '⚠️ Fully booked for selected dates';
            
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
            { id: 'p1', name: 'Monumento City Loft', location: 'Caloocan City, Metro Manila', price: 3500, type: 'studio', rating: 0, reviews: 0, imageClass: 'img-neon', images: ['img-neon', 'img-room1', 'img-kitchen', 'img-bathroom'], availableStart: '2024-01-01', availableEnd: '2099-12-31', guests: 2, beds: '1 Studio' },
            { id: 'p2', name: 'Malabon Cozy Cabin', location: 'Malabon City, Metro Manila', price: 4200, type: 'family', rating: 0, reviews: 0, imageClass: 'img-crimson', images: ['img-crimson', 'img-room2', 'img-view', 'img-pool'], availableStart: '2024-01-01', availableEnd: '2099-12-31', guests: 4, beds: '2 Bedrooms' },
            { id: 'p3', name: 'Valenzuela Resort', location: 'Valenzuela City, Metro Manila', price: 5000, type: 'deluxe', rating: 0, reviews: 0, imageClass: 'img-azure', images: ['img-azure', 'img-pool', 'img-room1', 'img-view'], availableStart: '2024-01-01', availableEnd: '2099-12-31', guests: 6, beds: '3 Bedrooms' },
            { id: 'p4', name: 'Marilao Nature Retreat', location: 'Marilao, Bulacan', price: 4800, type: 'suite', rating: 0, reviews: 0, imageClass: 'img-emerald', images: ['img-emerald', 'img-view', 'img-room2', 'img-kitchen'], availableStart: '2024-01-01', availableEnd: '2099-12-31', guests: 2, beds: '1 Bedroom' }
        ];
        localStorage.setItem('properties', JSON.stringify(initialProps));
    }
};
const getProperties = () => JSON.parse(localStorage.getItem('properties')) || [];

// Sync hardcoded HTML listings with LocalStorage to allow dynamic ratings
const syncProperties = () => {
    const cards = document.querySelectorAll('.listing-card');
    if (cards.length === 0) return;
    
    let props = getProperties();
    let updated = false;
    const extraImages = ['img-room1', 'img-pool', 'img-view', 'img-room2', 'img-bathroom', 'img-kitchen'];

    cards.forEach((card, index) => {
        // Skip dynamically generated trending cards so we don't duplicate them
        if (card.closest('#trending-destinations-grid')) return;

        const name = card.querySelector('h3')?.textContent.trim();
        if (!name) return;

        let existingProp = props.find(p => p.name === name);
        if (!existingProp) {
            const locationText = card.querySelector('.location')?.textContent.trim() || '';
            const priceText = card.querySelector('.price')?.textContent || '';
            const price = parseFloat(priceText.replace(/[^\d.]/g, '')) || 0;
            
            const baseImg = Array.from(card.querySelector('.card-image')?.classList || []).find(c => c.startsWith('img-')) || 'img-neon';
            const imgs = [baseImg, extraImages[index % extraImages.length], extraImages[(index + 1) % extraImages.length], extraImages[(index + 2) % extraImages.length]];
            
            existingProp = {
                id: 'p_sync_' + Date.now() + index,
                name: name,
                location: locationText,
                price: price,
                type: card.dataset.type || 'studio',
                rating: 0,
                reviews: 0,
                imageClass: baseImg,
                images: imgs,
                availableStart: card.dataset.availableStart || '2000-01-01',
                availableEnd: card.dataset.availableEnd || '2099-12-31',
                guests: parseInt(card.dataset.guests) || 2,
                beds: card.querySelectorAll('.text-muted')[1]?.textContent.trim() || '1 Bedroom'
            };
            props.push(existingProp);
            updated = true;
        }

        // Update the hardcoded HTML element with the local storage rating!
        const ratingContainer = card.querySelector('.card-rating');
        if (ratingContainer) {
            ratingContainer.innerHTML = `
                <span class="text-muted" style="margin-right: 0.25rem; font-size: 0.85rem;">Avg Rating:</span>
                <span class="text-primary">★ ${existingProp.rating > 0 ? existingProp.rating.toFixed(1) : 'New'}</span>
                <span class="text-muted" style="margin-left: 0.25rem;">(${existingProp.reviews} reviews)</span>
            `;
        }
    });

    if (updated) {
        localStorage.setItem('properties', JSON.stringify(props));
    }
};

// Stepper Input Logic
const initSteppers = () => {
    document.querySelectorAll('.stepper-input, .stepper-input-group').forEach(container => {
        const input = container.querySelector('input[type="number"]');
        const btnDown = container.querySelector('[data-step="down"]');
        const btnUp = container.querySelector('[data-step="up"]');
        const min = parseInt(input.min) || 1;
        const max = parseInt(input.max) || 20;

        if (!input || !btnDown || !btnUp) return;

        btnDown.addEventListener('click', () => {
            let value = parseInt(input.value) || min;
            if (value > min) {
                input.value = value - 1;
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });

        btnUp.addEventListener('click', () => {
            let value = parseInt(input.value) || min;
            if (value < max) {
                input.value = value + 1;
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
    });
};

// Custom Select Dropdown Logic
const initCustomSelects = () => {
    document.querySelectorAll('.custom-select-container').forEach(container => {
        const trigger = container.querySelector('.custom-select-trigger');
        const dropdown = container.querySelector('.custom-select-dropdown');
        const hiddenInput = container.querySelector('input[type="hidden"]');
        const triggerSpan = trigger.querySelector('span');
        const options = container.querySelectorAll('.custom-select-option');

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.calendar-popup, .time-picker-popup, .custom-select-dropdown').forEach(p => { if(p !== dropdown) p.classList.add('hidden'); });
            dropdown.classList.toggle('hidden');
        });

        options.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                hiddenInput.value = option.dataset.value;
                triggerSpan.textContent = option.textContent;
                options.forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                dropdown.classList.add('hidden');
                
                if (container.id === 'res-type-wrapper' && typeof performSearch === 'function') performSearch();
            });
        });

        dropdown.addEventListener('click', e => e.stopPropagation());
    });
};

// Custom Calendar Logic
const initCustomCalendars = () => {
    const setups = [
        { wrapperId: 'hero-dates-wrapper', triggerId: 'hero-date-trigger', checkinId: 'hero-checkin', checkoutId: 'hero-checkout', locationId: 'hero-location' },
        { wrapperId: 'res-dates-wrapper', triggerId: 'res-date-trigger', checkinId: 'checkin', checkoutId: 'checkout', locationId: 'location' }
    ];

    setups.forEach(setup => {
        const wrapper = document.getElementById(setup.wrapperId);
        if (!wrapper) return;

        const trigger = document.getElementById(setup.triggerId);
        const checkinInput = document.getElementById(setup.checkinId);
        const checkoutInput = document.getElementById(setup.checkoutId);
        const locationInput = document.getElementById(setup.locationId);
        
        // Inject Popup HTML
        const popup = document.createElement('div');
        popup.className = 'calendar-popup glass-panel hidden';
        popup.innerHTML = `
            <div class="flex-between mb-3 align-center">
                <button type="button" class="cal-nav" id="${setup.wrapperId}-prev">&lt;</button>
                <strong class="cal-month-year text-primary" id="${setup.wrapperId}-month"></strong>
                <button type="button" class="cal-nav" id="${setup.wrapperId}-next">&gt;</button>
            </div>
            <div class="grid-7 text-muted text-sm text-center mb-2 font-bold">
                <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
            </div>
            <div class="grid-7 text-center" id="${setup.wrapperId}-days"></div>
            <div class="cal-warnings mt-3" id="${setup.wrapperId}-warnings"></div>
        `;
        wrapper.appendChild(popup);

        let currentMonth = new Date();
        currentMonth.setDate(1);
        let startDate = checkinInput.value ? new Date(checkinInput.value) : null;
        let endDate = checkoutInput.value ? new Date(checkoutInput.value) : null;

        const formatDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

        const renderCalendar = () => {
            const daysContainer = document.getElementById(`${setup.wrapperId}-days`);
            const monthLabel = document.getElementById(`${setup.wrapperId}-month`);
            
            daysContainer.innerHTML = '';
            monthLabel.textContent = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

            const year = currentMonth.getFullYear();
            const month = currentMonth.getMonth();
            const firstDayIndex = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const today = new Date();
            today.setHours(0,0,0,0);

            for (let i = 0; i < firstDayIndex; i++) daysContainer.appendChild(document.createElement('div'));

            for (let i = 1; i <= daysInMonth; i++) {
                const dateObj = new Date(year, month, i);
                const dateStr = formatDateStr(dateObj);
                const dayEl = document.createElement('div');
                dayEl.className = 'cal-day';
                dayEl.textContent = i;

                if (dateObj < today) {
                    dayEl.classList.add('disabled');
                } else {
                    if (startDate && dateStr === formatDateStr(startDate)) dayEl.classList.add('selected');
                    if (endDate && dateStr === formatDateStr(endDate)) dayEl.classList.add('selected');
                    if (startDate && endDate && dateObj > startDate && dateObj < endDate) dayEl.classList.add('in-range');

                    dayEl.addEventListener('click', () => {
                        if (!startDate || (startDate && endDate)) {
                            startDate = dateObj; endDate = null;
                        } else if (dateObj < startDate) {
                            startDate = dateObj; endDate = null;
                        } else {
                            endDate = dateObj;
                        }

                        checkinInput.value = startDate ? formatDateStr(startDate) : '';
                        checkoutInput.value = endDate ? formatDateStr(endDate) : '';
                        
                        renderCalendar();
                        if (setup.wrapperId === 'res-dates-wrapper' && startDate && endDate && typeof performSearch === 'function') performSearch();
                    });
                }
                daysContainer.appendChild(dayEl);
            }
            
            const s = startDate ? startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Add dates';
            const e = endDate ? endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
            trigger.innerHTML = `<span class="${startDate ? 'text-primary font-bold' : 'text-muted'}">${s}${e ? ' - ' + e : ''}</span>
                                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-muted"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;

            // Real-time Warnings
            const warningsContainer = document.getElementById(`${setup.wrapperId}-warnings`);
            warningsContainer.innerHTML = '';
            if (startDate && endDate) {
                const checkinVal = formatDateStr(startDate);
                const checkoutVal = formatDateStr(endDate);
                const allBookings = getBookings().filter(b => b.status === 'upcoming');
                const conflictingBookings = {};
                
                const locationVal = locationInput ? locationInput.value.toLowerCase().trim() : '';

                // Only show warnings if the user has inputted a location
                if (locationVal) {
                    for (const booking of allBookings) {
                        if (booking.checkin && booking.checkout && checkinVal < booking.checkout && checkoutVal > booking.checkin) {
                            if ((booking.location || '').toLowerCase().includes(locationVal)) {
                                if (!conflictingBookings[booking.property]) conflictingBookings[booking.property] = [];
                                conflictingBookings[booking.property].push(booking);
                            }
                        }
                    }
                }

                if (Object.keys(conflictingBookings).length > 0) {
                    let warningHTML = '<div class="date-warnings-container m-0"><p class="text-gold mb-1" style="font-weight: 600; font-size:0.85rem;">Heads up! Existing bookings on these dates:</p><ul style="margin-top: 0;">';
                    const formatF = (dateStr) => new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    for (const propName in conflictingBookings) {
                        const ranges = conflictingBookings[propName].map(b => `${formatF(b.checkin)} - ${formatF(b.checkout)}`).join(', ');
                        warningHTML += `<li style="font-size: 0.75rem;"><strong>${propName}:</strong> ${ranges}</li>`;
                    }
                    warningHTML += '</ul></div>';
                    warningsContainer.innerHTML = warningHTML;
                }
            }
        };

        document.getElementById(`${setup.wrapperId}-prev`).addEventListener('click', (e) => { e.stopPropagation(); currentMonth.setMonth(currentMonth.getMonth() - 1); renderCalendar(); });
        document.getElementById(`${setup.wrapperId}-next`).addEventListener('click', (e) => { e.stopPropagation(); currentMonth.setMonth(currentMonth.getMonth() + 1); renderCalendar(); });
        
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.calendar-popup, .time-picker-popup, .custom-select-dropdown').forEach(p => { if(p !== popup) p.classList.add('hidden'); });
            popup.classList.toggle('hidden');
            renderCalendar();
        });
        
        // Re-render warnings live if user types in the location field while calendar is open
        if (locationInput) {
            locationInput.addEventListener('input', () => {
                if (!popup.classList.contains('hidden')) renderCalendar();
            });
        }
        
        popup.addEventListener('click', (e) => e.stopPropagation());
    });

    document.addEventListener('click', () => document.querySelectorAll('.calendar-popup, .time-picker-popup, .custom-select-dropdown').forEach(p => p.classList.add('hidden')));
};

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
document.querySelectorAll('#logout-btn, .sidebar-logout-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (window.logout) window.logout();
    });
});

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

// Global interval variable for the carousel auto-play
window.modalCarouselInterval = null;

// Property Details Modal Logic
const initPropertyModalUI = () => {
    if (document.getElementById('property-details-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'property-details-modal';
    modal.className = 'modal-overlay hidden';
    modal.innerHTML = `
        <div class="card glass-panel p-0 max-w-1000 w-100 property-modal-content mx-1">
            <button id="property-modal-close" class="property-modal-close" aria-label="Close">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <div class="property-modal-carousel">
                <div id="property-modal-image-track" style="display: flex; height: 100%; transition: transform 0.3s ease; width: 100%;"></div>
                <button id="modal-prev-img" class="carousel-nav-btn left">&lt;</button>
                <button id="modal-next-img" class="carousel-nav-btn right">&gt;</button>
                <div id="modal-img-indicators" style="position: absolute; bottom: 15px; left: 50%; transform: translateX(-50%); display: flex; gap: 6px; z-index:10;"></div>
            </div>
            <div class="property-modal-body">
                <div class="flex-between flex-wrap gap-1">
                    <div>
                        <h2 id="property-modal-title" class="text-primary mb-0" style="font-size: 1.75rem;">Property Name</h2>
                        <p id="property-modal-location" class="text-muted text-lg">Location &nbsp;|&nbsp; <span style="text-transform: capitalize; color: var(--primary-color); font-weight: 500;">Type</span></p>
                    </div>
                    <div class="text-right" style="text-align: right;">
                        <h3 id="property-modal-price" class="text-primary mb-0" style="font-size: 1.5rem;">₱0 / night</h3>
                        <div id="property-modal-rating" class="card-rating justify-end mt-1">★ New (0 reviews)</div>
                    </div>
                </div>
                
                <div class="grid-2-col gap-1 border-t pt-3 border-b pb-3">
                    <div class="flex-align-center text-muted">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        <span class="ml-2">Recommended: <span id="property-modal-guests" class="font-bold text-primary">2</span> person(s)</span>
                    </div>
                    <div class="flex-align-center text-muted">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><path d="M2 4v16"></path><path d="M2 8h18a2 2 0 0 1 2 2v10"></path><path d="M2 17h20"></path><path d="M6 8v9"></path></svg>
                        <span class="ml-2">Layout: <span id="property-modal-beds" class="font-bold text-primary">1 Bedroom</span></span>
                    </div>
                </div>

                <div class="property-modal-reviews-container">
                    <h3 class="mb-2 text-cyan">Guest Reviews</h3>
                    <div id="property-modal-reviews-list" class="property-modal-reviews-scroll">
                        <!-- Reviews will be injected here -->
                    </div>
                </div>
                <button id="property-modal-book-btn" class="btn btn-primary btn-glow w-100 mt-2" style="font-size: 1.1rem;">Book This Property</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
            document.body.classList.remove('modal-open');
            clearInterval(window.modalCarouselInterval);
        }
    });

    document.getElementById('property-modal-close').addEventListener('click', () => {
        modal.classList.add('hidden');
        document.body.classList.remove('modal-open');
        clearInterval(window.modalCarouselInterval);
    });
};

const openPropertyModal = (card) => {
    const modal = document.getElementById('property-details-modal');
    if (!modal) return;

    const name = card.querySelector('h3').textContent.trim();
    const location = card.querySelector('.location').textContent.trim();
    const price = card.querySelector('.price').textContent.trim();
    const guests = card.dataset.guests;
    
    // Find property in local storage for full details
    const props = getProperties();
    const propData = props.find(p => p.name === name);

    document.getElementById('property-modal-title').textContent = name;
    document.getElementById('property-modal-location').innerHTML = `${location} &nbsp;|&nbsp; <span style="text-transform: capitalize; color: var(--primary-color); font-weight: 500;">${propData?.type || card.dataset.type || 'Studio'}</span>`;
    document.getElementById('property-modal-price').textContent = price;
    document.getElementById('property-modal-guests').textContent = propData?.guests || guests || '2';
    document.getElementById('property-modal-beds').textContent = propData?.beds || '1 Bedroom';
    
    // Setup image carousel
    const baseImgClass = propData?.imageClass || Array.from(card.querySelector('.card-image').classList).find(c => c.startsWith('img-')) || 'img-neon';
    let images = propData?.images;
    if (!images || images.length === 0) {
        // Fallback for older properties saved before this update
        images = [baseImgClass, 'img-room1', 'img-view', 'img-bathroom'];
    }

    const track = document.getElementById('property-modal-image-track');
    const indicators = document.getElementById('modal-img-indicators');
    
    track.innerHTML = images.map(img => `<div class="property-modal-hero ${img}" style="min-width: 100%;"></div>`).join('');
    indicators.innerHTML = images.map((_, i) => `<div class="img-indicator" style="width: 8px; height: 8px; border-radius: 50%; background: ${i===0?'var(--primary-color)':'rgba(255,255,255,0.5)'}; transition: background 0.3s; cursor: pointer;"></div>`).join('');
    
    let currentImgIdx = 0;
    const updateCarousel = () => {
        track.style.transform = `translateX(-${currentImgIdx * 100}%)`;
        Array.from(indicators.children).forEach((dot, i) => {
            dot.style.background = i === currentImgIdx ? 'var(--primary-color)' : 'rgba(255,255,255,0.5)';
        });
    };
    
    const startAutoSlide = () => {
        clearInterval(window.modalCarouselInterval);
        window.modalCarouselInterval = setInterval(() => {
            currentImgIdx = (currentImgIdx < images.length - 1) ? currentImgIdx + 1 : 0;
            updateCarousel();
        }, 1750); // Flips every 1.75 seconds
    };
    
    const prevBtn = document.getElementById('modal-prev-img');
    const nextBtn = document.getElementById('modal-next-img');
    
    const newPrev = prevBtn.cloneNode(true);
    const newNext = nextBtn.cloneNode(true);
    prevBtn.parentNode.replaceChild(newPrev, prevBtn);
    nextBtn.parentNode.replaceChild(newNext, nextBtn);
    
    newPrev.addEventListener('click', (e) => {
        e.stopPropagation();
        currentImgIdx = (currentImgIdx > 0) ? currentImgIdx - 1 : images.length - 1;
        updateCarousel();
        startAutoSlide(); // Reset timer on manual interaction
    });
    
    newNext.addEventListener('click', (e) => {
        e.stopPropagation();
        currentImgIdx = (currentImgIdx < images.length - 1) ? currentImgIdx + 1 : 0;
        updateCarousel();
        startAutoSlide(); // Reset timer on manual interaction
    });

    Array.from(indicators.children).forEach((dot, i) => {
        dot.addEventListener('click', (e) => {
            e.stopPropagation();
            currentImgIdx = i;
            updateCarousel();
            startAutoSlide(); // Reset timer on manual interaction
        });
    });

    // Start auto-play immediately when modal opens
    startAutoSlide();

    // Rating
    const ratingHtml = `
        <span class="text-primary">★ ${propData && propData.rating > 0 ? propData.rating.toFixed(1) : 'New'}</span>
        <span class="text-muted ml-2">(${propData?.reviews || 0} reviews)</span>
    `;
    document.getElementById('property-modal-rating').innerHTML = ratingHtml;

    // Reviews
    const reviewsContainer = document.getElementById('property-modal-reviews-list');
    const allBookings = getBookings();
    const propertyReviews = allBookings.filter(b => b.property === name && b.status === 'past' && b.userRating);

    if (propertyReviews.length > 0) {
        reviewsContainer.innerHTML = propertyReviews.map(r => `
            <div class="review-card">
                <div class="flex-between mb-1">
                    <strong class="text-capitalize text-cyan">${r.user}</strong>
                    <span class="text-gold font-bold">★ ${r.userRating}/5</span>
                </div>
                <p class="text-muted text-sm mb-0">"${r.userReview}"</p>
            </div>
        `).join('');
    } else {
        reviewsContainer.innerHTML = '<p class="text-muted text-center py-3">No reviews yet. Be the first to leave one!</p>';
    }

    // Match button logic with the actual card
    const bookBtn = document.getElementById('property-modal-book-btn');
    const cardBookBtn = card.querySelector('.book-btn');
    
    bookBtn.onclick = () => {
        if (cardBookBtn && cardBookBtn.disabled) {
            alert('This property is fully booked for your selected dates.');
        } else {
            cardBookBtn.click();
        }
    };
    
    if (cardBookBtn && cardBookBtn.disabled) {
        bookBtn.disabled = true;
        bookBtn.textContent = 'Unavailable for Selected Dates';
        bookBtn.classList.remove('btn-primary', 'btn-glow');
        bookBtn.classList.add('btn-outline');
    } else {
        bookBtn.disabled = false;
        bookBtn.textContent = 'Book This Property';
        bookBtn.classList.remove('btn-outline');
        bookBtn.classList.add('btn-primary', 'btn-glow');
    }

    document.body.classList.add('modal-open');
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
                
                // Capture active search dates to carry over to checkout
                const searchCheckin = document.getElementById('checkin')?.value || document.getElementById('hero-checkin')?.value || '';
                const searchCheckout = document.getElementById('checkout')?.value || document.getElementById('hero-checkout')?.value || '';

                sessionStorage.setItem('pendingBooking', JSON.stringify({
                    property: propertyName,
                    location: location,
                    price: price,
                    guests: guests,
                    checkin: searchCheckin,
                    checkout: searchCheckout
                }));
                
                window.location.href = '../general/checkout.html';
            }
        });
    });
    
    // Setup Property Modal Click Event on the parent card
    document.querySelectorAll('.listing-card').forEach(card => {
        if (card.dataset.hasModalListener === 'true') return;
        card.dataset.hasModalListener = 'true';
        card.style.cursor = 'pointer';
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('book-btn') || e.target.closest('.book-btn')) return;
            if (typeof openPropertyModal === 'function') openPropertyModal(card);
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
            const ratingText = propertyInfo ? ` | Avg Rating: ★ ${propertyInfo.rating > 0 ? propertyInfo.rating.toFixed(1) : 'New'}` : '';

            return `
                <div class="glass-panel ${glowClass} p-4 flex-col">
                    <h3>${b.property}</h3>
                    <p class="text-muted">Location: ${b.location} | Price: ${b.price}${guestText}${bedText}${ratingText}</p>
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

        // Limit to 3 properties for the homepage layout
        const topProps = props.slice(0, 3);

        grid.innerHTML = topProps.map(p => `
            <div class="listing-card" data-location="${p.location.toLowerCase()}" data-guests="${p.guests}" data-type="${p.type || 'studio'}" data-available-start="${p.availableStart}" data-available-end="${p.availableEnd}" data-rate="${p.price}">
                <div class="card-image ${p.imageClass}"></div>
                <div class="card-content">
                    <h3>${p.name}</h3>
                    <p class="location" style="margin-bottom: 0.25rem;">${p.location}</p>
                    <p class="text-muted mb-1" style="font-size: 0.85rem; text-transform: capitalize;">Type: ${p.type || 'Studio'}</p>
                    <p class="text-muted mb-1" style="font-size: 0.85rem;">Recommended: ${p.guests} person(s)</p>
                    <p class="text-muted mb-2" style="font-size: 0.85rem;">${p.beds || '1 Bedroom'}</p>
                    <p class="price">₱${p.price.toLocaleString()} / night</p>
                    <div class="card-rating mb-3">
                        <span class="text-muted" style="margin-right: 0.25rem; font-size: 0.85rem;">Avg Rating:</span>
                        <span class="text-primary">★ ${p.rating > 0 ? p.rating.toFixed(1) : 'New'}</span>
                        <span class="text-muted" style="margin-left: 0.25rem;">(${p.reviews} reviews)</span>
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
    syncProperties();
    initPropertyModalUI();
    initSteppers();
    initCustomCalendars();
    initCustomSelects();
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
            checkinInput.value = pendingBooking.checkin || formatDate(today);
            
            checkoutInput.min = pendingBooking.checkin || formatDate(tomorrow);
            checkoutInput.value = pendingBooking.checkout || formatDate(tomorrow);

            // Initialize the single Custom Calendars for Checkout
            const initSingleCustomCalendars = () => {
                const setups = [
                    { wrapperId: 'checkout-checkin-wrapper', triggerId: 'checkout-checkin-trigger', inputId: 'checkin-date' },
                    { wrapperId: 'checkout-checkout-wrapper', triggerId: 'checkout-checkout-trigger', inputId: 'checkout-date' }
                ];
                const propertyBookings = getBookings().filter(b => b.property === pendingBooking.property && b.status === 'upcoming');

                setups.forEach(setup => {
                    const wrapper = document.getElementById(setup.wrapperId);
                    if (!wrapper) return;

                    const trigger = document.getElementById(setup.triggerId);
                    const inputField = document.getElementById(setup.inputId);
                    
                    const popup = document.createElement('div');
                    popup.className = 'calendar-popup glass-panel hidden';
                    popup.innerHTML = `
                        <div class="flex-between mb-3 align-center">
                            <button type="button" class="cal-nav" id="${setup.wrapperId}-prev">&lt;</button>
                            <strong class="cal-month-year text-primary" id="${setup.wrapperId}-month"></strong>
                            <button type="button" class="cal-nav" id="${setup.wrapperId}-next">&gt;</button>
                        </div>
                        <div class="grid-7 text-muted text-sm text-center mb-2 font-bold">
                            <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                        </div>
                        <div class="grid-7 text-center" id="${setup.wrapperId}-days"></div>
                        <div class="cal-warnings mt-3" id="${setup.wrapperId}-warnings"></div>
                    `;
                    wrapper.appendChild(popup);

                    let currentMonth = new Date();
                    if (inputField.value) currentMonth = new Date(inputField.value + 'T00:00:00');
                    currentMonth.setDate(1);

                    const formatDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

                    const renderCalendar = () => {
                        const daysContainer = document.getElementById(`${setup.wrapperId}-days`);
                        const monthLabel = document.getElementById(`${setup.wrapperId}-month`);
                        
                        daysContainer.innerHTML = '';
                        monthLabel.textContent = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

                        const year = currentMonth.getFullYear();
                        const month = currentMonth.getMonth();
                        const firstDayIndex = new Date(year, month, 1).getDay();
                        const daysInMonth = new Date(year, month + 1, 0).getDate();
                        const today = new Date();
                        today.setHours(0,0,0,0);
                        
                        let selectedDate = inputField.value ? new Date(inputField.value + 'T00:00:00') : null;

                        for (let i = 0; i < firstDayIndex; i++) daysContainer.appendChild(document.createElement('div'));

                        for (let i = 1; i <= daysInMonth; i++) {
                            const dateObj = new Date(year, month, i);
                            const dateStr = formatDateStr(dateObj);
                            const dayEl = document.createElement('div');
                            dayEl.className = 'cal-day';
                            dayEl.textContent = i;

                            // Visually disable fully booked days
                            let isBooked = false;
                            for (let b of propertyBookings) {
                                if (b.checkin && b.checkout) {
                                    const start = new Date(b.checkin + 'T00:00:00');
                                    const end = new Date(b.checkout + 'T00:00:00');
                                    if (setup.inputId === 'checkin-date' && dateObj >= start && dateObj < end) isBooked = true;
                                    if (setup.inputId === 'checkout-date' && dateObj > start && dateObj <= end) isBooked = true;
                                }
                            }

                            if (dateObj < today || isBooked) {
                                dayEl.classList.add('disabled');
                            } else {
                                if (selectedDate && dateStr === formatDateStr(selectedDate)) dayEl.classList.add('selected');
                                
                                dayEl.addEventListener('click', () => {
                                    inputField.value = dateStr;
                                    trigger.innerHTML = `<span class="text-primary font-bold">${dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-muted"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;
                                    popup.classList.add('hidden');
                                    inputField.dispatchEvent(new Event('change')); // Trigger auto-calculate
                                });
                            }
                            daysContainer.appendChild(dayEl);
                        }
                        
                        const s = selectedDate ? selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Select date';
                        trigger.innerHTML = `<span class="${selectedDate ? 'text-primary font-bold' : 'text-muted'}">${s}</span>
                                             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-muted"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;

                        // Display Warnings inside popup
                        const warningsContainer = document.getElementById(`${setup.wrapperId}-warnings`);
                        warningsContainer.innerHTML = '';
                        if (propertyBookings.length > 0) {
                            let warningHTML = '<div class="date-warnings-container m-0"><p class="text-gold mb-1" style="font-weight: 600; font-size:0.85rem;">Heads up! Booked dates:</p><ul style="margin-top: 0;">';
                            const formatF = (dateStr) => new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            propertyBookings.forEach(b => {
                                warningHTML += `<li style="font-size: 0.75rem;">${formatF(b.checkin)} - ${formatF(b.checkout)}</li>`;
                            });
                            warningHTML += '</ul></div>';
                            warningsContainer.innerHTML = warningHTML;
                        }
                    };

                    document.getElementById(`${setup.wrapperId}-prev`).addEventListener('click', (e) => { e.stopPropagation(); currentMonth.setMonth(currentMonth.getMonth() - 1); renderCalendar(); });
                    document.getElementById(`${setup.wrapperId}-next`).addEventListener('click', (e) => { e.stopPropagation(); currentMonth.setMonth(currentMonth.getMonth() + 1); renderCalendar(); });
                    
                    trigger.addEventListener('click', (e) => {
                        e.stopPropagation();
                        document.querySelectorAll('.calendar-popup').forEach(p => { if(p !== popup) p.classList.add('hidden'); });
                        popup.classList.toggle('hidden');
                        renderCalendar();
                    });
                    
                    popup.addEventListener('click', (e) => e.stopPropagation());
                    renderCalendar(); // Render text immediately on page load
                });
            };
            initSingleCustomCalendars();

            // Initialize Custom iOS-Style Time Picker
            const initCustomTimePicker = () => {
                const wrapper = document.getElementById('checkout-time-wrapper');
                if (!wrapper) return;

                const trigger = document.getElementById('checkout-time-trigger');
                const inputField = document.getElementById('arrival-time');
                
                const popup = document.createElement('div');
                popup.className = 'time-picker-popup glass-panel hidden';
                
                let hHTML = '', mHTML = '';
                for(let i=1; i<=12; i++) hHTML += `<div class="time-wheel-item" data-val="${String(i).padStart(2,'0')}">${String(i).padStart(2,'0')}</div>`;
                for(let i=0; i<=59; i++) mHTML += `<div class="time-wheel-item" data-val="${String(i).padStart(2,'0')}">${String(i).padStart(2,'0')}</div>`;
                let aHTML = `<div class="time-wheel-item" data-val="AM">AM</div><div class="time-wheel-item" data-val="PM">PM</div>`;

                popup.innerHTML = `
                    <div class="text-center mb-3 text-primary font-bold">Select Arrival Time</div>
                    <div class="time-wheels">
                        <div class="time-selection-band"></div>
                        <div class="time-wheel" id="wheel-h">${hHTML}</div>
                        <div class="time-wheel" id="wheel-m">${mHTML}</div>
                        <div class="time-wheel" id="wheel-a">${aHTML}</div>
                    </div>
                    <button type="button" class="btn btn-primary btn-glow w-100 mt-2" id="time-confirm-btn">Confirm Time</button>
                `;
                wrapper.appendChild(popup);

                const updateActive = (wheel) => {
                    const idx = Math.round(wheel.scrollTop / 40); // 40px is the item height
                    wheel.querySelectorAll('.time-wheel-item').forEach((item, i) => {
                        item.classList.toggle('active', i === idx);
                    });
                };

                ['wheel-h', 'wheel-m', 'wheel-a'].forEach(id => {
                    const w = document.getElementById(id);
                    w.addEventListener('scroll', () => updateActive(w));
                    
                    // Add click-to-select functionality
                    w.addEventListener('click', (e) => {
                        if (e.target.classList.contains('time-wheel-item')) {
                            const index = Array.from(w.querySelectorAll('.time-wheel-item')).indexOf(e.target);
                            w.scrollTop = index * 40; // 40 is the item height
                        }
                    });
                    
                    updateActive(w);
                });
                
                // Default to 02:00 PM
                document.getElementById('wheel-h').scrollTop = 40 * 1;
                document.getElementById('wheel-a').scrollTop = 40 * 1;

                trigger.addEventListener('click', (e) => {
                    e.stopPropagation();
                    document.querySelectorAll('.calendar-popup, .time-picker-popup').forEach(p => { if(p !== popup) p.classList.add('hidden'); });
                    popup.classList.toggle('hidden');
                });

                document.getElementById('time-confirm-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    const val = `${document.getElementById('wheel-h').querySelector('.active')?.dataset.val || '12'}:${document.getElementById('wheel-m').querySelector('.active')?.dataset.val || '00'} ${document.getElementById('wheel-a').querySelector('.active')?.dataset.val || 'PM'}`;
                    trigger.innerHTML = `<span class="text-primary font-bold">${val}</span> <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-muted"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
                    inputField.value = val;
                    popup.classList.add('hidden');
                });
                popup.addEventListener('click', (e) => e.stopPropagation());
            };
            initCustomTimePicker();

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

                // --- STRICT DATE CONFLICT VALIDATION ---
                const submitBtn = document.getElementById('pay-now-btn');
                const warningEl = document.getElementById('checkout-date-warning');
                let isConflict = false;
                let conflictReason = '';

                const finalCheckin = checkinInput.value;
                const finalCheckout = checkoutInput.value;

                // 1. Property bounds validation
                const props = getProperties();
                const currentProp = props.find(p => p.name === pendingBooking.property);
                if (currentProp) {
                    let availStart = currentProp.availableStart;
                    if (!availStart || !availStart.includes('-')) availStart = '2000-01-01';
                    let availEnd = currentProp.availableEnd;
                    if (!availEnd || !availEnd.includes('-')) availEnd = '2099-12-31';

                    if (finalCheckin < availStart || finalCheckout > availEnd) {
                        isConflict = true;
                        conflictReason = `Property is unavailable for these dates.`;
                    }
                }

                // 2. Existing booking overlaps validation
                if (!isConflict) {
                    const allBookings = getBookings().filter(b => b.property === pendingBooking.property && b.status === 'upcoming');
                    const formatF = (dateStr) => new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    
                    for (const b of allBookings) {
                        if (b.checkin && b.checkout && finalCheckin < b.checkout && finalCheckout > b.checkin) {
                            isConflict = true;
                            conflictReason = `Fully booked on: ${formatF(b.checkin)} - ${formatF(b.checkout)}`;
                            break;
                        }
                    }
                }

                // Enforce UI lock
                if (isConflict) {
                    if (warningEl) { warningEl.innerHTML = `⚠️ <span style="font-weight:normal;">${conflictReason}</span>`; warningEl.classList.remove('hidden'); }
                    if (submitBtn) { submitBtn.disabled = true; submitBtn.style.opacity = '0.5'; submitBtn.style.cursor = 'not-allowed'; submitBtn.textContent = 'Dates Unavailable'; }
                } else {
                    if (warningEl) { warningEl.classList.add('hidden'); warningEl.innerHTML = ''; }
                    if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = '1'; submitBtn.style.cursor = 'pointer'; submitBtn.textContent = 'Confirm & Pay'; }
                }
            };

            // Listeners
            checkinInput.addEventListener('change', calculateTotals);
            checkoutInput.addEventListener('change', calculateTotals);
            checkinInput.addEventListener('input', calculateTotals);
            checkoutInput.addEventListener('input', calculateTotals);
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
                    if (cardDetails) cardDetails.classList.remove('hidden');
                    if (gcashDetails) gcashDetails.classList.add('hidden');
                    } else {
                    if (cardDetails) cardDetails.classList.add('hidden'); // Hide if GCash
                    if (gcashDetails) gcashDetails.classList.remove('hidden');
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
                    if (submitBtn.disabled) return; // Strict hard block against submission
                    
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

                        // Trigger Custom UI Modal instead of browser alert
                        const successModal = document.getElementById('booking-success-modal');
                        if (successModal) {
                            successModal.classList.remove('hidden');
                            const doRedirect = () => {
                                if (window.redirectToDashboard) window.redirectToDashboard();
                                else window.location.href = '../user/dashboard.html';
                            };
                            
                            document.getElementById('success-redirect-btn').addEventListener('click', doRedirect);
                            setTimeout(doRedirect, 3500); // Auto-redirect after 3.5 seconds
                        }
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

        // Handle standard text/number/select inputs
        ['location', 'guests', 'max-price', 'property-type'].forEach(param => {
            if (urlParams.has(param) && urlParams.get(param)) {
                const inputElement = document.getElementById(param);
                if (inputElement) {
                    inputElement.value = urlParams.get(param);
                    hasParams = true;
                    
                    // If it's the custom select, visually update it
                    if (param === 'property-type') {
                        const wrapper = document.getElementById('res-type-wrapper');
                        if (wrapper) {
                            const option = wrapper.querySelector(`.custom-select-option[data-value="${urlParams.get(param)}"]`);
                            if (option) {
                                wrapper.querySelector('.custom-select-trigger span').textContent = option.textContent;
                                wrapper.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('selected'));
                                option.classList.add('selected');
                            }
                        }
                    }
                }
            }
        });

        // Handle custom date picker inputs
        const checkinVal = urlParams.get('checkin');
        const checkoutVal = urlParams.get('checkout');
        if (checkinVal && checkoutVal) {
            const checkinInput = document.getElementById('checkin');
            const checkoutInput = document.getElementById('checkout');
            const dateTrigger = document.getElementById('res-date-trigger');

            if (checkinInput && checkoutInput && dateTrigger) {
                checkinInput.value = checkinVal;
                checkoutInput.value = checkoutVal;

                const startDate = new Date(checkinVal + 'T00:00:00');
                const endDate = new Date(checkoutVal + 'T00:00:00');
                const s = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const e = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                
                dateTrigger.innerHTML = `<span class="text-primary font-bold">${s} - ${e}</span>
                                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-muted"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;
                hasParams = true;
            }
        }

        if (hasParams) {
            performSearch();
        }
    }
});