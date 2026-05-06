// Contains the complex property search and filtering logic

import { getBookings } from '../services/storage.js';

export const performSearch = () => {
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