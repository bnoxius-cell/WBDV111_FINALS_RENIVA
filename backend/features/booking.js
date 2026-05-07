// Handles the entire booking process, from checkout to rendering user bookings

import { getBookings, getProperties, saveBooking, saveProperty } from '../services/storage.js';
import { showLoginPromptModal, showTermsModal, showCancelModal, openPropertyModal, showCustomAlert } from '../ui/modals.js';
import { redirectToDashboard } from '../ui/components.js';

// Booking Logic
let isBookingListenerAttached = false;

export const setupBookingButtons = () => {
    if (isBookingListenerAttached) return;
    isBookingListenerAttached = true;
    
    document.body.addEventListener('click', (e) => {
        // 1. Book Button Logic
        const bookBtn = e.target.closest('.book-btn');
        if (bookBtn) {
            const currentUser = sessionStorage.getItem('currentUser');
            if (!currentUser) {
                e.preventDefault();
                showLoginPromptModal();
                return;
            }

            const card = bookBtn.closest('.listing-card');
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
            return; // Stop event from triggering the card modal below
        }
        
        // 2. Property Card Modal Logic
        const card = e.target.closest('.listing-card');
        if (card) {
            // Do not open modal if clicking on a button inside the card
            if (e.target.closest('button')) return;
            
            if (typeof openPropertyModal === 'function') openPropertyModal(card);
        }
    });
};

// Render Bookings Logic
export const renderUserBookings = () => {
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
            let ratingHTML = '';
            if (b.status === 'upcoming') {
                actionBtn = `<button class="btn btn-primary btn-glow w-fit complete-stay-btn" data-id="${b.id}" data-property="${b.property}">Complete Stay</button>
                             <button class="btn btn-outline btn-danger w-fit cancel-booking-btn" data-id="${b.id}">Cancel Booking</button>`;
            } else if (b.status === 'past' && b.userRating) {
                ratingHTML = `<p class="text-muted mt-2 mb-0" style="font-size: 0.9rem;">Your Rating: <span class="text-primary font-bold">★ ${b.userRating}/5</span><br>"${b.userReview}"</p>`;
            }
            
            const propertyInfo = props.find(p => p.name === b.property);
            const guestText = propertyInfo ? ` | Recommended: ${propertyInfo.guests} person(s)` : '';
            let bedText = '';
            if (propertyInfo && propertyInfo.beds) {
                const beds = propertyInfo.beds;
                const bedsDisplay = !isNaN(beds) && Number(beds) > 0 ? `${beds} bedroom${Number(beds) !== 1 ? 's' : ''}` : beds;
                bedText = ` | ${bedsDisplay}`;
            }
            const ratingText = propertyInfo ? ` | Avg Rating: ★ ${propertyInfo.rating > 0 ? propertyInfo.rating.toFixed(1) : 'New'}` : '';

            let durationText = '';
            if (b.checkin && b.checkout) {
                const d1 = new Date(b.checkin);
                const d2 = new Date(b.checkout);
                const diffTime = Math.abs(d2 - d1);
                const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

                const formatF = (dateStr) => new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const checkinFormatted = formatF(b.checkin);
                const checkoutFormatted = formatF(b.checkout);

                durationText = `<p class="text-gold font-bold mt-3 mb-0" style="border-top: 1px solid rgba(255, 255, 255, 0.05); padding-top: 1rem;">${checkinFormatted} - ${checkoutFormatted} (${nights} night${nights > 1 ? 's' : ''})</p>`;
            }

            let displayStatus = b.status;
            if (b.status === 'past') displayStatus = 'completed';

            let dateInfo = `(Booked on ${b.dateBooked})`;
            if (b.status === 'past') {
                const completedDate = b.dateCompleted || (b.checkout ? new Date(b.checkout + 'T00:00:00').toLocaleDateString() : 'N/A');
                dateInfo = `(Booked on ${b.dateBooked} | Completed on ${completedDate})`;
            }

            return `
                <div class="glass-panel ${glowClass} p-4 flex-col property-summary-card">
                    <h3>${b.property}</h3>
                    <p class="text-muted mb-0">Location: ${b.location} | Price: ${b.price}${guestText}${bedText}${ratingText}</p>
                    <p class="${colorClass} mt-2 font-bold mb-0">Status: <span style="text-transform: capitalize;">${displayStatus}</span> <span class="text-muted ml-1" style="font-size: 0.9em; font-weight: 500;">${dateInfo}</span></p>
                    ${durationText}
                    ${ratingHTML}
                    <div class="flex-align-center flex-wrap mt-3" style="gap: 0.75rem; justify-content: flex-end;">
                        <button class="btn btn-outline view-unit-btn w-fit">View Unit</button>
                        ${actionBtn}
                    </div>
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

        // Bind cancel booking buttons
        document.querySelectorAll('.cancel-booking-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const bookingId = e.target.getAttribute('data-id');
                const booking = getBookings().find(b => b.id === bookingId);
                if (booking && typeof showCancelModal === 'function') showCancelModal(booking);
            });
        });
    }

    // 2. User Dashboard Page
    const dashboardContainer = document.getElementById('dashboard-recent-bookings');
    if (dashboardContainer) {
        if (userBookings.length > 0) {
            const props = getProperties();
            const recent = userBookings.slice(-10).reverse(); // Show up to the 10 most recent bookings
            dashboardContainer.innerHTML = recent.map(b => {
                const propertyInfo = props.find(p => p.name === b.property);
                const guestText = propertyInfo ? ` | Recommended: ${propertyInfo.guests} person(s)` : '';

                let durationText = '';
                if (b.checkin && b.checkout) {
                    const d1 = new Date(b.checkin);
                    const d2 = new Date(b.checkout);
                    const diffTime = Math.abs(d2 - d1);
                    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

                    const formatF = (dateStr) => new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    const checkinFormatted = formatF(b.checkin);
                    const checkoutFormatted = formatF(b.checkout);

                    durationText = `<p class="text-gold font-bold mt-3 mb-0" style="border-top: 1px solid rgba(255, 255, 255, 0.05); padding-top: 1rem;">${checkinFormatted} - ${checkoutFormatted} (${nights} night${nights > 1 ? 's' : ''})</p>`;
                }

                let statusColor = 'text-muted';
                let displayStatus = b.status.charAt(0).toUpperCase() + b.status.slice(1);
                let dateInfo = `(Booked on ${b.dateBooked})`;

                if (b.status === 'upcoming') { statusColor = 'text-green'; }
                else if (b.status === 'past') { 
                    statusColor = 'text-gold'; 
                    displayStatus = 'Completed'; 
                    const completedDate = b.dateCompleted || (b.checkout ? new Date(b.checkout + 'T00:00:00').toLocaleDateString() : 'N/A');
                    dateInfo = `(Booked on ${b.dateBooked} | Completed on ${completedDate})`;
                }
                else if (b.status === 'canceled') { statusColor = 'text-crimson'; displayStatus = 'Canceled'; }

                return `
                    <div class="glass-panel p-4 property-summary-card">
                        <h4 class="text-primary mb-1">${b.property}</h4>
                        <p class="text-muted mb-2" style="font-size: 0.9rem;">${b.location}${guestText} - <span class="${statusColor}" style="font-weight: 600;">${displayStatus}</span> <span class="text-muted" style="font-weight: normal; font-size: 0.85rem; margin-left: 0.25rem;">${dateInfo}</span></p>
                        ${durationText}
                        <div class="mt-3">
                            <button class="btn btn-outline view-unit-btn w-fit">View Unit</button>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            dashboardContainer.innerHTML = '<p class="text-center text-muted">You have no recent bookings.</p>';
        }
    }

    // Bind View Unit buttons
    document.querySelectorAll('.view-unit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const card = e.target.closest('.property-summary-card');
            if (card && typeof openPropertyModal === 'function') {
                openPropertyModal(card);
            }
        });
    });
};

// Admin Render Bookings Logic
export const renderAdminBookings = () => {
    const adminContainer = document.getElementById('admin-reservations-list');
    if (!adminContainer) return;

    const allBookings = getBookings(); // Gets data from Supabase cache
    
    if (allBookings.length === 0) {
        adminContainer.innerHTML = '<p class="text-center text-muted">No reservations found in the system.</p>';
        return;
    }

    adminContainer.innerHTML = allBookings.slice().reverse().map(b => {
        let actionButtons = '';
        if (b.status === 'upcoming') {
            actionButtons = `<button class="btn btn-outline btn-danger w-fit admin-cancel-booking-btn" data-id="${b.id}">Cancel Booking</button>`;
        } else {
            actionButtons = `<button class="btn btn-outline w-fit admin-delete-booking-btn" data-id="${b.id}">Delete Record</button>`;
        }

        return `
        <div class="glass-panel p-4 property-summary-card flex-col">
            <div class="flex-between mb-2">
                <h3 class="text-primary m-0">${b.property} <span class="text-muted" style="font-size: 0.9rem; font-weight: 500;">(${b.location})</span></h3>
                <span class="text-capitalize font-bold ${b.status === 'upcoming' ? 'text-green' : b.status === 'canceled' ? 'text-crimson' : 'text-gold'}">${b.status === 'past' ? 'completed' : b.status}</span>
            </div>
            <p class="text-muted mb-1"><strong>Guest:</strong> <span class="text-capitalize">${b.user}</span></p>
            <p class="text-muted mb-1"><strong>Dates:</strong> ${b.checkin} to ${b.checkout}</p>
            <p class="text-muted mb-0" style="font-size: 0.85rem;"><strong>ID:</strong> ${b.id} &nbsp;|&nbsp; <strong>Total:</strong> ${b.price}</p>
            ${b.note ? `<div class="mt-2 p-2 glass-panel-soft" style="border-left: 3px solid var(--primary-color); border-radius: 4px;"><p class="m-0 text-muted" style="font-size: 0.85rem;"><strong>Note:</strong> ${b.note}</p></div>` : ''}
            <div class="flex-align-center flex-wrap mt-auto border-t pt-3 mt-3" style="gap: 0.75rem; justify-content: flex-end;">
                ${actionButtons}
            </div>
        </div>
    `}).join('');
};

// Review and Completion Logic
export const initReviewLogic = () => {
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
        reviewForm.addEventListener('submit', async (e) => {
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
                b.dateCompleted = new Date().toLocaleDateString();
                
                // Update Property Rating dynamically
                const props = getProperties();
                const propIndex = props.findIndex(p => p.name === b.property);
                if (propIndex > -1) {
                    const p = props[propIndex];
                    const totalScore = (p.rating * p.reviews) + rating;
                    p.reviews += 1;
                    p.rating = totalScore / p.reviews;
                    await saveProperty(p);
                }

                await saveBooking(b);

                modal.classList.add('hidden');
                reviewForm.reset();
                renderUserBookings(); // Instantly visually refresh the tabs
                
                showCustomAlert('Review Submitted', 'Thank you for your review! Your stay has been marked as completed.', 'success');
            }
        });
    }
};

// Checkout Logic
export const initCheckout = () => {
    const checkinInput = document.getElementById('checkin-date');
    const checkoutInput = document.getElementById('checkout-date');
    const guestsInput = document.getElementById('guests-count');
    
    if (checkinInput && checkoutInput) {
        const pendingBooking = JSON.parse(sessionStorage.getItem('pendingBooking'));
        
        if (!pendingBooking) {
            showCustomAlert('Error', 'No pending booking found. Redirecting to home.', 'error').then(() => {
                window.location.href = 'index.html';
            });
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
        
        // Inject Terms and Conditions Checkbox
        const submitBtn = document.getElementById('pay-now-btn');
        if (submitBtn && !document.getElementById('tc-checkbox')) {
            const tcContainer = document.createElement('div');
            tcContainer.className = 'form-group mt-4 mb-3';
            tcContainer.innerHTML = `
                <label style="cursor: pointer; gap: 0.75rem; display: flex; align-items: start;">
                    <input type="checkbox" id="tc-checkbox" required style="width: 1.25rem; height: 1.25rem; accent-color: var(--primary-color); margin-top: 0.2rem; flex-shrink: 0;">
                    <span class="text-muted" style="font-size: 0.9rem; line-height: 1.4;">I agree to the <a href="#" id="tc-link" class="text-primary font-bold">Terms of Service and Cancellation Policy</a>, including the rules on damages and breakages.</span>
                </label>
            `;

            const noteContainer = document.createElement('div');
            noteContainer.className = 'form-group mt-4 mb-2';
            noteContainer.innerHTML = `
                <label class="form-label" for="checkout-note">Special Requests & Support Note</label>
                <textarea id="checkout-note" class="form-control resize-y" rows="3" placeholder="Any special requests, early check-in needs, or questions for our support team?"></textarea>
            `;
            submitBtn.parentNode.insertBefore(noteContainer, submitBtn);
            submitBtn.parentNode.insertBefore(tcContainer, submitBtn);

            document.getElementById('tc-link').addEventListener('click', (e) => {
                e.preventDefault();
                if (typeof showTermsModal === 'function') showTermsModal();
            });
        }

        if (checkoutForm) {
            checkoutForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const submitBtn = document.getElementById('pay-now-btn');
                if (submitBtn.disabled) return; // Strict hard block against submission
                
                submitBtn.innerHTML = '<span class="pulse-dot" style="display:inline-block; margin-right:8px; background-color:white;"></span> Processing...';
                submitBtn.style.pointerEvents = 'none';
                submitBtn.style.opacity = '0.8';
                
                // Simulate a network request delay
                setTimeout(async () => {
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
                        dateBooked: new Date().toLocaleDateString(),
                        note: document.getElementById('checkout-note') ? document.getElementById('checkout-note').value.trim() : ''
                    };
                    
                    const result = await saveBooking(newBooking);
                    
                    if (result && !result.success) {
                        await showCustomAlert('Checkout Failed', 'Failed to confirm booking: ' + result.error, 'error');
                        submitBtn.innerHTML = 'Confirm & Pay';
                        submitBtn.style.pointerEvents = 'auto';
                        submitBtn.style.opacity = '1';
                        submitBtn.disabled = false;
                        return;
                    }

                    sessionStorage.removeItem('pendingBooking');

                    // Trigger Custom UI Modal instead of browser alert
                    const successModal = document.getElementById('booking-success-modal');
                    if (successModal) {
                        successModal.classList.remove('hidden');
                        const doRedirect = () => {
                            redirectToDashboard();
                        };
                        
                        document.getElementById('success-redirect-btn').addEventListener('click', doRedirect);
                        setTimeout(doRedirect, 3500); // Auto-redirect after 3.5 seconds
                    }
                }, 1500);
            });
        }
    }
};

// Render Support Queue Logic
export const renderSupportQueue = () => {
    const queueContainer = document.getElementById('support-queue-list');
    if (!queueContainer) return;

    const bookingsWithNotes = getBookings().filter(b => b.note && b.note.trim() !== '');

    if (bookingsWithNotes.length === 0) {
        queueContainer.innerHTML = '<p class="text-center text-muted mt-4">No support inquiries at the moment.</p>';
        return;
    }

    queueContainer.innerHTML = bookingsWithNotes.slice().reverse().map(b => `
        <div class="glass-panel p-4 flex-col" ${b.noteResolved ? 'style="opacity: 0.6;"' : ''}>
            <div class="flex-between mb-2">
                <h3 class="text-primary m-0">Booking Inquiry - ${b.id}</h3>
                <span class="font-bold ${b.noteResolved ? 'text-gold' : 'text-green'}">${b.noteResolved ? 'Resolved' : 'Open'}</span>
            </div>
            <p class="text-muted mb-1"><strong>From:</strong> <span class="text-capitalize">${b.user}</span> &nbsp;|&nbsp; <strong>Property:</strong> ${b.property}</p>
            <p class="text-muted mb-2"><strong>Received:</strong> ${b.dateBooked}</p>
            <p class="mb-3">"${b.note}"</p>
            <div class="flex-align-center flex-wrap gap-1 mt-auto border-t pt-3">
                <button class="btn btn-primary btn-glow w-fit reply-ticket-btn">Reply</button>
                ${!b.noteResolved ? `<button class="btn btn-outline w-fit resolve-ticket-btn" data-id="${b.id}">Mark as Resolved</button>` : `<button class="btn btn-outline btn-danger w-fit delete-ticket-btn" data-id="${b.id}">Delete Ticket</button>`}
            </div>
        </div>
    `).join('');
};